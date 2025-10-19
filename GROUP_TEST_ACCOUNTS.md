# Group Admin & Moderator Test Accounts

**Last Updated:** October 17, 2025

## 🔐 Universal Password

All test accounts use the same password:
```
test123
```

---

## 👥 Group Admins & Moderators

### Admin Accounts

#### 1. **Alice (Super Admin)**
- **Username:** `admin_alice`
- **Email:** `alice@groups.test`
- **Password:** `test123`
- **Role:** Admin
- **Groups:**
  - ✅ techcommunity (admin)
  - ✅ general (admin)
  - ✅ sf-bay-area (admin)
  - ✅ california (admin)
  - ✅ usa (admin)

**Best for testing:** Multi-group admin features

---

#### 2. **Frank (Food Admin)**
- **Username:** `frank_foodie`
- **Email:** `frank@groups.test`
- **Password:** `test123`
- **Role:** Admin
- **Groups:**
  - ✅ foodieheaven (admin)

**Best for testing:** Single group admin features

---

#### 3. **Henry (Gaming Admin)**
- **Username:** `henry_gamer`
- **Email:** `henry@groups.test`
- **Password:** `test123`
- **Role:** Admin
- **Groups:**
  - ✅ gaminghub (admin)

**Best for testing:** Gaming community moderation

---

#### 4. **GroupTest User**
- **Username:** `grouptest`
- **Email:** `grouptest@test.com`
- **Password:** `test123`
- **Role:** Admin
- **Groups:**
  - ✅ testgroup (admin)

**Best for testing:** Basic admin features

---

### Moderator Accounts

#### 1. **Bob (Tech Moderator)**
- **Username:** `mod_bob`
- **Email:** `bob@groups.test`
- **Password:** `test123`
- **Role:** Moderator
- **Groups:**
  - ✅ techcommunity (moderator)

**Best for testing:** Moderator-only permissions (limited compared to admin)

---

## 🧪 Testing Scenarios

### Admin Testing

**Login as:** `admin_alice` / `test123`

**What you can test:**
1. **Access Moderation Console:**
   - Go to: `http://localhost:3000/g/techcommunity/moderate`
   - Should see all 5 tabs:
     - Pending Members
     - Pending Posts
     - Members
     - Banned
     - Activity Log

2. **Manage Members:**
   - Approve/reject membership requests
   - Change member roles (promote to moderator)
   - Ban/unban members

3. **Manage Posts:**
   - Approve/reject pending posts
   - Remove posts
   - Pin/unpin posts

4. **View Activity:**
   - See moderation history
   - Track all admin actions

5. **Upload Images:**
   - Update group avatar
   - Update group banner

---

### Moderator Testing

**Login as:** `mod_bob` / `test123`

**What you can test:**
1. **Access Moderation Console:**
   - Go to: `http://localhost:3000/g/techcommunity/moderate`
   - Should see green "Moderator" badge

2. **Limited Permissions:**
   - ✅ Can approve/reject posts
   - ✅ Can remove posts
   - ✅ Can view pending members
   - ❌ Cannot change member roles
   - ❌ Cannot update group settings
   - ❌ Cannot upload avatar/banner

3. **Verify Role Restrictions:**
   - Try to promote member to moderator (should fail)
   - Try to remove admin (should fail)

---

## 🚀 Quick Login URLs

### Direct Login Links

**Alice (Super Admin):**
```
http://localhost:3000/login
Username: admin_alice
Password: test123
```

**Bob (Moderator):**
```
http://localhost:3000/login
Username: mod_bob
Password: test123
```

**Frank (Food Admin):**
```
http://localhost:3000/login
Username: frank_foodie
Password: test123
```

---

## 📋 Group URLs for Testing

### Techcommunity (has both admin & moderator)
- **Browse:** `http://localhost:3000/g/techcommunity`
- **Moderate:** `http://localhost:3000/g/techcommunity/moderate`
- **Admin:** admin_alice
- **Moderator:** mod_bob

### General (admin only)
- **Browse:** `http://localhost:3000/g/general`
- **Moderate:** `http://localhost:3000/g/general/moderate`
- **Admin:** admin_alice

### FoodieHeaven (admin only)
- **Browse:** `http://localhost:3000/g/foodieheaven`
- **Moderate:** `http://localhost:3000/g/foodieheaven/moderate`
- **Admin:** frank_foodie

### GamingHub (admin only)
- **Browse:** `http://localhost:3000/g/gaminghub`
- **Moderate:** `http://localhost:3000/g/gaminghub/moderate`
- **Admin:** henry_gamer

---

## 🧑‍💻 All Available Groups

| Group | Slug | Admin(s) | Moderators |
|-------|------|----------|------------|
| Tech Community | techcommunity | admin_alice | mod_bob |
| General | general | admin_alice | - |
| SF Bay Area | sf-bay-area | admin_alice | - |
| California | california | admin_alice | - |
| USA | usa | admin_alice | - |
| Foodie Heaven | foodieheaven | frank_foodie | - |
| Gaming Hub | gaminghub | henry_gamer | - |
| Test Group | testgroup | grouptest | - |

---

## 🔍 Checking Permissions in Database

To verify roles:
```sql
-- Check all group memberships
SELECT
    u.username,
    g.name as group_name,
    gm.role,
    gm.status
FROM group_memberships gm
JOIN users u ON gm.user_id = u.id
JOIN groups g ON gm.group_id = g.id
WHERE gm.status = 'active'
ORDER BY g.name, gm.role;
```

---

## 🛠️ Creating New Test Admins/Moderators

### Via API:
```bash
# Register new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newadmin",
    "email": "newadmin@test.com",
    "password": "test123",
    "first_name": "New",
    "last_name": "Admin"
  }'

# Join group
curl -X POST http://localhost:3001/api/groups/techcommunity/join \
  -H "Authorization: Bearer YOUR_TOKEN"

# Promote to admin (as existing admin)
curl -X PUT http://localhost:3001/api/groups/techcommunity/members/{userId}/role \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"role": "admin"}'
```

### Via Database:
```sql
-- Make user an admin of a group
INSERT INTO group_memberships (group_id, user_id, role, status)
VALUES (
    (SELECT id FROM groups WHERE slug = 'techcommunity'),
    (SELECT id FROM users WHERE username = 'newuser'),
    'admin',
    'active'
);
```

---

## ⚠️ Important Notes

1. **All test passwords are `test123`** - DO NOT use in production!

2. **Role Hierarchy:**
   - **Admin** > Full control (settings, roles, moderation)
   - **Moderator** > Content moderation only
   - **Member** > Regular user

3. **Moderation Console Access:**
   - Only visible to admins and moderators
   - Regular members see 404 or redirect

4. **Test Data:**
   - All users are test accounts from seed data
   - Safe to modify/delete for testing

5. **Backend must be running:**
   ```bash
   cd backend
   NODE_ENV=development DB_SSL=false node src/server.js
   ```

6. **Frontend must be running:**
   ```bash
   cd frontend
   npm start
   ```

---

## 🎯 Recommended Testing Flow

### 1. Test Admin Features (use admin_alice)
- Login as admin_alice
- Go to techcommunity moderation console
- Try all 5 tabs
- Approve/reject actions
- Change member roles

### 2. Test Moderator Features (use mod_bob)
- Login as mod_bob
- Go to techcommunity moderation console
- Verify moderator badge shows
- Try content moderation
- Verify cannot change roles

### 3. Test Multi-Group Admin (use admin_alice)
- Browse between different groups
- Check moderation console access
- Verify admin across all assigned groups

### 4. Test Regular Member (create new account)
- Register new account
- Join a group
- Verify NO moderation console access
- Verify NO admin buttons

---

## 📞 Support

If you need additional test accounts or run into issues:

1. Check backend logs
2. Check database for group_memberships
3. Verify JWT token includes user role
4. Check browser console for errors

---

**Happy Testing! 🎉**
