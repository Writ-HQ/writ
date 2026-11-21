package httpserver

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/Writ-HQ/writ/api/internal/apierror"
	"github.com/Writ-HQ/writ/api/internal/health"
	"github.com/Writ-HQ/writ/api/internal/oapi"
)

func TestTenantContextAdmitsAMember(t *testing.T) {
	r := newTestRouter(discardLogger(), health.New(discardLogger()))

	rec := request(t, r, http.MethodGet, "/v1/tenants/"+stubTenantID.String(), "Bearer "+stubToken)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d (%s), want 200", rec.Code, rec.Body.String())
	}
	var tenant oapi.Tenant
	if err := json.Unmarshal(rec.Body.Bytes(), &tenant); err != nil {
		t.Fatal(err)
	}
	// The handler answered from what the middleware resolved.
	if tenant.Id != stubTenantID || tenant.Role != "admin" || tenant.Name != "Example Campaign" {
		t.Errorf("body = %s, want the resolved tenant and role", rec.Body.String())
	}
}

func TestTenantContextAnswers404ForEverythingElse(t *testing.T) {
	r := newTestRouter(discardLogger(), health.New(discardLogger()))

	// The body every unreachable tenant must match exactly: that of a path
	// that does not exist at all.
	unknownPath := request(t, r, http.MethodGet, "/v1/nothing-here", "Bearer "+stubToken)
	if unknownPath.Code != http.StatusNotFound {
		t.Fatalf("an unknown path = %d, want 404", unknownPath.Code)
	}

	for name, id := range map[string]string{
		"a tenant the caller is not in": "0192f0c4-7d2a-7b1e-9c3f-00000000ffff",
		"not a UUID":                    "not-a-uuid",
		"a number":                      "42",
		"a UUID with extra characters":  stubTenantID.String() + "0",
		"the nil UUID":                  "00000000-0000-0000-0000-000000000000",
		"an encoded slash":              "a%2Fb",
	} {
		t.Run(name, func(t *testing.T) {
			for _, method := range []string{http.MethodGet, http.MethodPatch} {
				rec := request(t, r, method, "/v1/tenants/"+id, "Bearer "+stubToken)
				if rec.Code != http.StatusNotFound {
					t.Fatalf("%s: status = %d (%s), want 404", method, rec.Code, rec.Body.String())
				}
				if rec.Body.String() != unknownPath.Body.String() {
					t.Errorf("%s: body = %s, want exactly %s", method, rec.Body.String(), unknownPath.Body.String())
				}
			}
		})
	}
}

func TestTenantContextNeedsAuthenticationFirst(t *testing.T) {
	r := newTestRouter(discardLogger(), health.New(discardLogger()))
	// Without a token, a real tenant and a made-up one look the same.
	for _, id := range []string{stubTenantID.String(), "not-a-uuid"} {
		rec := request(t, r, http.MethodGet, "/v1/tenants/"+id)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("GET /v1/tenants/%s without a token = %d, want 401", id, rec.Code)
		}
	}
}

func TestTenantContextFailureIsA500ThatHidesTheCause(t *testing.T) {
	var logs bytes.Buffer
	r := newTestRouter(slog.New(slog.NewJSONHandler(&logs, nil)), health.New(discardLogger()))

	rec := request(t, r, http.MethodGet, "/v1/tenants/"+brokenTenantID.String(), "Bearer "+stubToken)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	if body := decodeError(t, rec); body.Code != apierror.InternalError {
		t.Errorf("code = %q, want internal_error", body.Code)
	}
	if strings.Contains(rec.Body.String(), "connection refused") {
		t.Errorf("body leaks the cause: %s", rec.Body.String())
	}
	if !strings.Contains(logs.String(), "connection refused") {
		t.Errorf("the cause was not logged: %s", logs.String())
	}
}

// Tenant-scoped operations are recognised by the {tenant_id} parameter.
// Every path that takes a tenant must use that exact name and sit under
// /v1/tenants/{tenant_id}, or the membership check would not run for it.
func TestEveryTenantPathUsesTheTenantParameter(t *testing.T) {
	spec, err := os.ReadFile("../../../openapi/openapi.yaml")
	if err != nil {
		t.Fatal(err)
	}
	pathLine := regexp.MustCompile(`(?m)^  (/\S*):$`)
	found := 0
	for _, match := range pathLine.FindAllStringSubmatch(string(spec), -1) {
		path := match[1]
		lower := strings.ToLower(path)
		if !strings.Contains(lower, "tenant") {
			continue
		}
		if path == "/v1/tenants" {
			continue // the collection: list mine, create one
		}
		found++
		if !strings.HasPrefix(path, "/v1/tenants/{"+tenantParam+"}") {
			t.Errorf("path %s names a tenant but is not under /v1/tenants/{%s}", path, tenantParam)
		}
	}
	if found == 0 {
		t.Error("no tenant-scoped paths found in the spec; has the layout changed?")
	}
	// And nothing takes a tenant by another route.
	for _, other := range []string{"{tenantId}", "{tenant}", "{tenantID}", "X-Tenant"} {
		if strings.Contains(string(spec), other) {
			t.Errorf("the spec uses %s; tenants are identified only by the {%s} path parameter", other, tenantParam)
		}
	}
}
