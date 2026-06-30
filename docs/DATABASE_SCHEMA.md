# Apply4K — Database Schema

PostgreSQL in production, SQLite for local dev (SQLAlchemy 2.x ORM). JSON columns store
structured AI output. Single demo user in the MVP.

```
┌────────────┐        ┌──────────────┐        ┌──────────────────┐
│   users    │1──────*│   resumes    │1──────*│   applications   │
└────────────┘        └──────────────┘        └──────────────────┘
      │1                     │1                         
      │                      │                          
      *                      *                          
┌────────────┐        ┌──────────────┐
│    jobs    │        │   messages   │
└────────────┘        └──────────────┘
```

### `users`
| col | type | notes |
|-----|------|-------|
| id | PK int | |
| name | text | |
| email | text unique | |
| created_at | timestamptz | |

### `resumes`
| col | type | notes |
|-----|------|-------|
| id | PK int | |
| user_id | FK users | |
| filename | text | |
| candidate_name | text | |
| email / phone | text null | |
| links | jsonb | `{linkedin, github, portfolio}` |
| skills | jsonb | `string[]` |
| projects | jsonb | `[{name, description, tech[]}]` |
| education | jsonb | |
| experience | jsonb | |
| best_fit_roles | jsonb | `string[]` |
| missing_keywords | jsonb | `string[]` |
| raw_text | text | full extracted text |
| created_at | timestamptz | |

### `jobs`
| col | type | notes |
|-----|------|-------|
| id | PK int | |
| user_id | FK users | |
| title / company | text | |
| location | text null | |
| description | text | |
| url / source | text null | source: linkedin, greenhouse, lever, ashby, wellfound, yc |
| easy_apply | bool | |
| score | int null | 0..100 |
| recommendation | text null | Apply / Maybe / Skip |
| red_flags | jsonb | `string[]` |
| score_breakdown | jsonb | |
| created_at | timestamptz | |

### `applications`
| col | type | notes |
|-----|------|-------|
| id | PK int | |
| user_id | FK users | |
| resume_id | FK resumes null | |
| job_id | FK jobs null | |
| company / job_title | text | |
| location / job_link | text null | |
| fit_score | int null | |
| resume_version | text null | |
| date_applied | date null | |
| status | enum | Saved, Applied, HR Contacted, Interview, Rejected, Offer |
| notes | text null | |
| follow_up_date | date null | |
| created_at / updated_at | timestamptz | |

### `messages`
| col | type | notes |
|-----|------|-------|
| id | PK int | |
| user_id | FK users | |
| job_id | FK jobs null | |
| type | text | linkedin_note, recruiter_message, hr_email, cover_letter, follow_up, thank_you |
| content | text | |
| created_at | timestamptz | |

### Indexes
- `jobs(user_id, score desc)` — recommendation feed
- `applications(user_id, status)` — tracker board
- `applications(follow_up_date)` — reminders
