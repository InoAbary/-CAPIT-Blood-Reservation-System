# Demo database seed

Run from the repository root.

```sh
node backend/seed/index.cjs --dry-run
SEED_MONGODB_URI='mongodb://127.0.0.1:27017/sandugo_demo' node backend/seed/index.cjs
```

The seed uses its own explicit connection string. Use a development database. All newly seeded staff, admin, and donor accounts use `password123`, stored as a bcrypt hash with 10 rounds. Donors use `donor-1@sandugo.example` through `donor-8@sandugo.example`. Staff and admin accounts use the staff login.

| Facility | Staff sign-ins (add `@sandugo.example`) |
| --- | --- |
| Demo Quezon City Blood Supply Facility | `qc-bsf-staff`, `qc-bsf-branch-admin` |
| Demo Pasig Hospital Blood Service Facility | `pasig-bsf-staff`, `pasig-bsf-branch-admin` |
| Demo Quezon City Hospital | `qc-hosp-staff`, `qc-hosp-hospital` |
| Demo Pasig Hospital | `pasig-hosp-staff`, `pasig-hosp-hospital` |

The system admin is `admin@sandugo.example` and has no facility. Donor notifications start disabled for the demo accounts. For delivery testing, use contact details you control and enable the relevant channel.

Each facility starts with one donor-linked bag for every combination of eight blood types and four components supported by the blood-unit model. Inventory totals are calculated from eligible bags. You can rerun the seed to insert missing records and recount inventory. Existing accounts and bags retain their passwords, release status, and expiry dates.
