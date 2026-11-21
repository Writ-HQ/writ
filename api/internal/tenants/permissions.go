package tenants

// Role is a member's role in one tenant. The values match the CHECK
// constraint on memberships.role and the Role enum in the API contract.
type Role string

// The four roles, from most to least access.
const (
	RoleOwner     Role = "owner"
	RoleAdmin     Role = "admin"
	RoleStaff     Role = "staff"
	RoleVolunteer Role = "volunteer"
)

// Permission is one thing a member may be allowed to do in a tenant,
// named "resource.action".
type Permission string

// Permissions. Add new ones here and grant them in rolePermissions; a
// permission no role holds is granted to nobody.
const (
	// TenantRead: see the tenant's own details.
	TenantRead Permission = "tenant.read"
	// TenantUpdate: change the tenant's name and default language.
	TenantUpdate Permission = "tenant.update"
)

// rolePermissions is the whole permission table: what each role may do.
// It is deliberately explicit, one list per role with no inheritance, so
// that reading a role's line tells you everything it can do. A test pins
// the table; changing who can do what means changing that test too.
var rolePermissions = map[Role][]Permission{
	RoleOwner:     {TenantRead, TenantUpdate},
	RoleAdmin:     {TenantRead, TenantUpdate},
	RoleStaff:     {TenantRead},
	RoleVolunteer: {TenantRead},
}

// Can reports whether the role holds the permission. An unknown role
// holds none.
func (r Role) Can(p Permission) bool {
	for _, granted := range rolePermissions[r] {
		if granted == p {
			return true
		}
	}
	return false
}
