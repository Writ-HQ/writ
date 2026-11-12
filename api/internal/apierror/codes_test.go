package apierror

import (
	"go/ast"
	"go/parser"
	"go/token"
	"slices"
	"strconv"
	"testing"
)

// generatedEnum returns the values of the constants of the given type in the
// code generated from openapi/openapi.yaml, which mirror the spec's enum.
func generatedEnum(t *testing.T, typeName string) []string {
	t.Helper()
	file, err := parser.ParseFile(token.NewFileSet(), "../oapi/oapi.gen.go", nil, 0)
	if err != nil {
		t.Fatalf("parsing generated code: %v", err)
	}

	var values []string
	for _, decl := range file.Decls {
		gen, ok := decl.(*ast.GenDecl)
		if !ok || gen.Tok != token.CONST {
			continue
		}
		for _, spec := range gen.Specs {
			vs := spec.(*ast.ValueSpec)
			if id, ok := vs.Type.(*ast.Ident); !ok || id.Name != typeName {
				continue
			}
			for _, v := range vs.Values {
				s, err := strconv.Unquote(v.(*ast.BasicLit).Value)
				if err != nil {
					t.Fatalf("unquoting %s constant: %v", typeName, err)
				}
				values = append(values, s)
			}
		}
	}
	if len(values) == 0 {
		t.Fatalf("no %s constants found in the generated code", typeName)
	}
	slices.Sort(values)
	return values
}

func sorted[T ~string](in []T) []string {
	out := make([]string, len(in))
	for i, v := range in {
		out[i] = string(v)
	}
	slices.Sort(out)
	return out
}

func TestCodesMatchTheSpec(t *testing.T) {
	got, want := sorted(Codes), generatedEnum(t, "ErrorCode")
	if !slices.Equal(got, want) {
		t.Errorf("Codes and the ErrorCode enum in openapi.yaml disagree:\n codes.go: %v\n spec:     %v", got, want)
	}
}

func TestDetailCodesMatchTheSpec(t *testing.T) {
	got, want := sorted(DetailCodes), generatedEnum(t, "ErrorDetailCode")
	if !slices.Equal(got, want) {
		t.Errorf("DetailCodes and the ErrorDetailCode enum in openapi.yaml disagree:\n codes.go: %v\n spec:     %v", got, want)
	}
}

func TestCodesAreUniqueAndValid(t *testing.T) {
	seen := map[Code]bool{}
	for _, c := range Codes {
		if seen[c] {
			t.Errorf("code %q is listed twice", c)
		}
		seen[c] = true
		if !c.Valid() {
			t.Errorf("code %q is not in the spec", c)
		}
	}
	for _, c := range DetailCodes {
		if !c.Valid() {
			t.Errorf("detail code %q is not in the spec", c)
		}
	}
}
