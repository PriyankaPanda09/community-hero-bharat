# Firestore Security Specification - Community Hero

This document outlines the data invariants, threat model via "Dirty Dozen" payloads, and validation strategy for the `issues` collection in Firestore.

---

## 1. Data Invariants

1. **Identity Integrity**: The `reporterId` field in any newly created or updated issue document MUST strictly match the authenticated user's UID (`request.auth.uid`).
2. **Email Verification**: To prevent spoofing, the reporter's email MUST match the auth email token (`request.auth.token.email`).
3. **Temporal Invariance**: The `timestamp` field must be set to the server timestamp (`request.time`) during creation, or remain immutable.
4. **Field Immutability**: Critical fields like `reporterId`, `reporterEmail`, `timestamp`, and `location` are immutable after document creation.
5. **State Transitions & Tiered Access**:
   - Only the original reporter or an administrator can modify user-editable fields like `note`.
   - Any authenticated resident/officer can transition the `status` of an issue (e.g., to `In Progress` or `Resolved`), but they are strictly restricted to updating ONLY the `status` field using `incoming().diff(existing()).affectedKeys().hasOnly(['status'])`.
6. **Value & Boundary Limits**:
   - Issue category must be one of `['pothole', 'streetlight', 'garbage', 'water_leak', 'other']`.
   - Issue severity must be one of `['low', 'medium', 'high']`.
   - Issue status must be one of `['Open', 'In Progress', 'Resolved']`.
   - Descriptions and strings must be strictly bounded in size to prevent "Denial of Wallet" memory-bloat attacks.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads attempt to break the laws of Identity, Integrity, and State, and must be rejected by the Firestore rules.

1. **The Identity Spoof (Create)**: A user tries to report an issue under someone else's UID to frame them or make fake reports.
   ```json
   {
     "category": "pothole",
     "severity": "medium",
     "description": "Pothole on Pine St",
     "location": { "address": "Pine St" },
     "status": "Open",
     "reporterId": "victim_uid_123",
     "reporterName": "Sarah Chen",
     "reporterEmail": "sarah.chen@greenfield-civic.org",
     "timestamp": "2026-06-24T12:00:00Z"
   }
   ```
   *Expected: PERMISSION_DENIED (reporterId does not match request.auth.uid).*

2. **The Email Spoof (Create)**: A user authenticated as `user@gmail.com` tries to set their reporterEmail to `mayor@greenfield.gov`.
   ```json
   {
     "category": " streetlight",
     "severity": "low",
     "description": "Dark bulb",
     "location": { "address": "88 Elm St" },
     "status": "Open",
     "reporterId": "attacker_uid",
     "reporterName": "Mayor Impersonator",
     "reporterEmail": "mayor@greenfield.gov",
     "timestamp": "2026-06-24T12:00:00Z"
   }
   ```
   *Expected: PERMISSION_DENIED (reporterEmail must match authenticated email).*

3. **The Backdated Report (Create)**: An attacker tries to submit a report backdated by 5 years.
   ```json
   {
     "category": "garbage",
     "severity": "low",
     "description": "Trash piling up",
     "location": { "address": "Pine St" },
     "status": "Open",
     "reporterId": "attacker_uid",
     "reporterName": "Attacker",
     "reporterEmail": "attacker@gmail.com",
     "timestamp": "2021-06-24T12:00:00Z"
   }
   ```
   *Expected: PERMISSION_DENIED (timestamp must match request.time).*

4. **The Ghost Field Attack (Create/Update)**: A user attempts to inject a hidden `isSystemOfficer: true` property to gain higher-level administrative access.
   ```json
   {
     "category": "pothole",
     "severity": "medium",
     "description": "Broken sidewalk",
     "location": { "address": "Main St" },
     "status": "Open",
     "reporterId": "attacker_uid",
     "reporterName": "Attacker",
     "reporterEmail": "attacker@gmail.com",
     "timestamp": "request.time",
     "isSystemOfficer": true
   }
   ```
   *Expected: PERMISSION_DENIED (Strict keys schema check fails).*

5. **The Location Hijack (Update)**: A user attempts to edit the coordinates of an existing issue to moving it to a completely different neighborhood.
   ```json
   {
     "location": { "address": "123 New Fake Address", "lat": 12.34, "lng": 56.78 }
   }
   ```
   *Expected: PERMISSION_DENIED (location is immutable).*

6. **The Unsigned Report (Create)**: An unauthenticated guest user tries to write a report directly to the Firestore collection.
   *Expected: PERMISSION_DENIED (Auth token is required).*

7. **The Privilege Escalation (Update)**: A non-reporter user tries to modify the `description` or `photoUrl` of someone else's report.
   ```json
   {
     "description": "This is a fake description now."
   }
   ```
   *Expected: PERMISSION_DENIED (Only status changes are allowed by non-reporters).*

8. **The Status Over-Write (Update)**: An attacker attempts to simultaneously change the `status` AND the `reporterName` of a report.
   ```json
   {
     "status": "In Progress",
     "reporterName": "Hacked Name"
   }
   ```
   *Expected: PERMISSION_DENIED (Non-reporter update affectedKeys must ONLY contain 'status').*

9. **The Denial-of-Wallet Long ID (Create)**: An attacker injects a 10,000-character malicious string as the document ID path variable.
   *Expected: PERMISSION_DENIED (isValidId constraint checks length).*

10. **The Size Exhaustion (Create)**: An attacker attempts to upload a 5MB text string as the `description` or `note`.
    ```json
    {
      "description": "[5MB of repetitive text...]"
    }
    ```
    *Expected: PERMISSION_DENIED (String length checks on create).*

11. **The Illegal Status Transition (Update)**: A user attempts to set an invalid state like `status: "Deleted"` or `status: "SuperResolved"`.
    ```json
    {
      "status": "SuperResolved"
    }
    ```
    *Expected: PERMISSION_DENIED (Status must be 'Open', 'In Progress', or 'Resolved').*

12. **The Terminal State Override (Update)**: An attacker attempts to reset a "Resolved" issue back to "Open" or edit its details after resolution has been completed.
    ```json
    {
      "status": "Open"
    }
    ```
    *Expected: PERMISSION_DENIED (Once status reaches 'Resolved', state is locked unless corrected by an administrator).*

---

## 3. The Security Rule Test Runner

We will deploy our rules as a robust security fortress to ensure all the above malicious operations are strictly blocked by Firestore.
