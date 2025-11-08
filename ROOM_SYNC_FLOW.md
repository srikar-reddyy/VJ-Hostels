# 🏢 Room Syncing Complete Flow Documentation

## 📋 Overview
This document explains the complete flow of how **automatic real-time room syncing** works in the VJ-Hostels application.

**Important**: Room syncing now happens **automatically and in real-time** using MongoDB Change Streams. This means rooms sync instantly whenever student data changes - through API calls, MongoDB Compass edits, bulk imports, or any other database modification!

---

## 🔄 Automatic Syncing Flow Diagram

### **Four-Layer Real-Time Syncing System**

```
┌─────────────────────────────────────────────────────────────────┐
│                  REAL-TIME SYNCING ARCHITECTURE                  │
│                                                                  │
│  Layer 1: 🔴 MongoDB Change Streams (PRIMARY - REAL-TIME)       │
│  Layer 2: ⚡ API-Triggered Sync (IMMEDIATE)                     │
│  Layer 3: 🚀 Server Startup Sync (ON RESTART)                   │
│  Layer 4: 📅 Scheduled Daily Sync (BACKUP - 2:00 AM)           │
└─────────────────────────────────────────────────────────────────┘

### **Layer 1: Real-Time Change Stream Monitoring** 🔴

```
┌─────────────────────────────────────────────────────────────────┐
│           MONGODB CHANGE STREAM WATCHER (PRIMARY)                │
│  Location: server/services/roomChangeStreamWatcher.js           │
│                                                                  │
│  🎯 Watches Student Collection for ANY Changes                  │
│                                                                  │
│  Triggers on:                                                    │
│  • INSERT - New student created                                 │
│  • UPDATE - Student data modified (room field change)           │
│  • REPLACE - Entire student document replaced                   │
│  • DELETE - Student removed from database                       │
│                                                                  │
│  ✅ Works for ALL data sources:                                 │
│  • API endpoints                                                 │
│  • MongoDB Compass manual edits                                 │
│  • Bulk imports/scripts                                          │
│  • Database migrations                                           │
│  • Any external database modification                            │
│                                                                  │
│  ⚡ Real-time Response:                                          │
│  • Detects change instantly (< 100ms)                           │
│  • Syncs affected rooms immediately                             │
│  • No page reload needed                                         │
│  • No server restart required                                    │
│  • No polling overhead                                           │
│                                                                  │
│  Change Detection Logic:                                         │
│  1. Student inserted with room → Sync new room                  │
│  2. Student room changed → Sync old & new rooms                 │
│  3. Student deactivated → Sync their room                       │
│  4. Student deleted → Sync their previous room                  │
│  5. No room field change → Skip sync (efficient)                │
└─────────────────────────────────────────────────────────────────┘
```

### **Layer 2: API-Triggered Sync** ⚡

### **Trigger Points (Student CRUD Operations)**

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOMATIC SYNC TRIGGERS                       │
│                                                                  │
│  Syncing happens automatically when:                             │
│  1. ✅ Student Registration (new student with room)             │
│  2. 🗑️  Student Deactivation/Deletion                          │
│  3. 🔄 Room Change (student moves to different room)            │
│  4. ✏️  Student Update (if room field changes)                  │
│  5. 🔓 Unassign from Room (student removed from room)           │
│  6. 🔄 Room Exchange (two students swap rooms)                  │
│  7. 📋 Bulk Room Allocation (allocate-rooms)                    │
│  8. 🎲 Generate Students (with room assignments)                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Students.jsx)                       │
│  Location: frontend/src/components/admin/Students.jsx           │
│                                                                  │
│  Action:                                                         │
│  • Admin performs student operation (register/update/delete)     │
│  • Frontend makes API request to backend                         │
│  • Backend processes request AND auto-syncs room                 │
│  • Frontend receives success response                            │
│  • UI updates automatically                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND API (adminAPI.js)                       │
│  Location: server/APIs/adminAPI.js                              │
│                                                                  │
│  Endpoints with Auto-Sync:                                       │
│                                                                  │
│  1. POST /admin-api/student-register                            │
│     • Creates student                                            │
│     • Calls syncSingleRoom(student.room)                        │
│                                                                  │
│  2. POST /admin-api/student-delete                              │
│     • Deactivates student                                        │
│     • Calls syncSingleRoom(student.room)                        │
│                                                                  │
│  3. POST /admin-api/change-student-room                         │
│     • Updates student room                                       │
│     • Calls syncSingleRoom(oldRoom)                             │
│     • Calls syncSingleRoom(newRoom)                             │
│                                                                  │
│  4. POST /admin-api/update-student                              │
│     • Updates student details                                    │
│     • If room changed: calls syncSingleRoom(old & new)          │
│                                                                  │
│  5. PUT /admin-api/unassign-student-room                        │
│     • Removes student from room                                  │
│     • Calls syncSingleRoom(oldRoom)                             │
│                                                                  │
│  6. PUT /admin-api/exchange-student-rooms                       │
│     • Swaps rooms between two students                           │
│     • Calls syncSingleRoom() for both rooms                     │
│                                                                  │
│  7. POST /admin-api/allocate-rooms                              │
│     • Bulk allocates unassigned students to vacant rooms         │
│     • Syncs all affected rooms after allocation                 │
│                                                                  │
│  8. POST /admin-api/generate-students                           │
│     • Generates random students with room assignments            │
│     • Calls full syncStudentsToRooms() after generation         │
└────────────────────────┬────────────────────────────────────────┘
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│            ROOM SYNC SERVICE (roomSyncService.js)                │
│  Location: server/services/roomSyncService.js                   │
│                                                                  │
│  Two Main Functions:                                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Function 1: syncSingleRoom(roomNumber)                   │  │
│  │ ✨ NEW - For automatic syncing                           │  │
│  │                                                           │  │
│  │ Purpose: Fast sync of a single room after changes        │  │
│  │                                                           │  │
│  │ Process:                                                  │  │
│  │ 1. Validate roomNumber (skip if null/invalid)            │  │
│  │ 2. Find all active students in this room                 │  │
│  │ 3. Find or create the room document                      │  │
│  │ 4. Update room.occupants with student IDs                │  │
│  │ 5. Check capacity warnings                               │  │
│  │ 6. Log sync result                                       │  │
│  │                                                           │  │
│  │ Benefits:                                                 │  │
│  │ • Fast - only updates 1-2 rooms                          │  │
│  │ • Efficient - runs after each operation                  │  │
│  │ • Real-time - immediate UI reflection                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Function 2: syncStudentsToRooms()                        │  │
│  │ 📊 Legacy - For full system sync                         │  │
│  │                                                           │  │
│  │ Purpose: Sync ALL students to ALL rooms                  │  │
│  │                                                           │  │
│  │ Process:                                                  │  │
│  │ Purpose: Sync ALL students to ALL rooms                  │  │
│  │                                                           │  │
│  │ Process:                                                  │  │
│  │ 1. Query all active students with room assignments       │  │
│  │ 2. Extract unique room numbers (with safety checks)      │  │
│  │ 3. Create missing rooms automatically                    │  │
│  │ 4. Clear ALL room occupants                              │  │
│  │ 5. Group students by room                                │  │
│  │ 6. Update ALL rooms with their students                  │  │
│  │ 7. Return comprehensive statistics                       │  │
│  │                                                           │  │
│  │ Use Cases:                                                │  │
│  │ • Database maintenance/cleanup                           │  │
│  │ • System-wide corrections                                │  │
│  │ • Initial setup/migration                                │  │
│  │ • Available via API endpoint (admin only)                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Automatic Sync Flow Examples

### Example 1: Student Registration
```
1. Admin registers new student with room "101"
   ↓
2. Backend saves student to database
   ↓
3. Backend calls: syncSingleRoom("101")
   ↓
4. Room 101 is updated with new occupant
   ↓
5. Response sent to frontend (student created ✅)
   ↓
6. UI updates automatically
```

### Example 2: Room Change
```
1. Admin changes student from room "101" to "205"
   ↓
2. Backend updates student.room = "205"
   ↓
3. Backend calls: syncSingleRoom("101") (remove from old room)
   ↓
4. Backend calls: syncSingleRoom("205") (add to new room)
   ↓
5. Both rooms updated in database
   ↓
6. Response sent to frontend (room changed ✅)
   ↓
7. UI shows updated room assignments
```

### Example 3: Student Deletion
```
1. Admin deactivates/deletes student from room "309"
   ↓
2. Backend sets student.is_active = false
   ↓
3. Backend calls: syncSingleRoom("309")
   ↓
4. Room 309 removes student from occupants
   ↓
5. Response sent to frontend (student deleted ✅)
   ↓
6. UI updates room vacancy count
```

---

## 📁 Files Involved

### 1. **Frontend**
- **File**: `frontend/src/components/admin/Students.jsx`
- **Purpose**: 
  - Student management UI
  - Triggers backend operations
  - Displays sorted student lists
  - No manual sync needed - real-time updates via change streams

- **File**: `frontend/src/components/admin/Rooms.jsx`
- **Purpose**: 
  - Room overview and statistics
  - Manual sync button **removed** (real-time now)
  - Shows live room occupancy data

### 2. **Backend API Routes**
- **File**: `server/APIs/adminAPI.js`
- **Key Endpoints**:
  - `POST /admin-api/student-register` → Auto-syncs room (Layer 2)
  - `POST /admin-api/student-delete` → Auto-syncs room (Layer 2)
  - `POST /admin-api/change-student-room` → Auto-syncs both rooms (Layer 2)
  - `POST /admin-api/update-student` → Auto-syncs if room changed (Layer 2)
  - `PUT /admin-api/unassign-student-room` → Auto-syncs old room (Layer 2)
  - `PUT /admin-api/exchange-student-rooms` → Auto-syncs both rooms (Layer 2)
  - `POST /admin-api/allocate-rooms` → Auto-syncs all affected rooms (Layer 2)
  - `POST /admin-api/generate-students` → Full sync after generation (Layer 2)
  - `POST /admin-api/rooms/sync` → Manual full sync (admin emergency use)
  - `GET /admin-api/rooms/all-with-students` → Fetch rooms with occupants

### 3. **Room Sync Service**
- **File**: `server/services/roomSyncService.js`
- **Functions**:
  - `syncSingleRoom(roomNumber)` - Fast single-room sync (used by Layers 1 & 2)
  - `syncStudentsToRooms()` - Full system sync (used by Layers 3 & 4)
  - `extractFloorNumber(roomNumber)` - Helper function
  - `getRoomStatistics()` - Get occupancy stats

### 4. **Real-Time Watcher (NEW!)** 🆕
- **File**: `server/services/roomChangeStreamWatcher.js`
- **Purpose**: MongoDB Change Stream watcher for real-time syncing
- **Functions**:
  - `startRoomChangeStreamWatcher()` - Start watching Student collection
  - `stopRoomChangeStreamWatcher()` - Stop watcher on shutdown
  - `handleStudentChange()` - Process detected changes
  - `handleStudentInsert()` - Handle new student
  - `handleStudentUpdate()` - Handle student updates (room changes)
  - `handleStudentReplace()` - Handle document replacements
  - `handleStudentDelete()` - Handle student deletion
  - `isWatcherActive()` - Check watcher status
- **Benefits**:
  - ✅ Real-time detection (< 100ms)
  - ✅ Works for ALL database changes
  - ✅ No polling overhead
  - ✅ Auto-reconnects on errors
  - ✅ Efficient - only syncs affected rooms

### 5. **Server Entry Point**
- **File**: `server/server.js`
- **Initialization**:
  - Starts Change Stream watcher after MongoDB connection (Layer 1)
  - Runs full sync on startup (Layer 3)
  - Schedules daily sync job (Layer 4)
  - Graceful shutdown to close change stream properly

### 6. **Scheduled Jobs**
- **File**: `server/jobs/roomSyncScheduler.js`
- **Purpose**: Backup scheduled sync (Layer 4)
- **Schedule**: Daily at 2:00 AM (Asia/Kolkata timezone)

### 7. **Database Models**
### 7. **Database Models**
- **File**: `server/models/StudentModel.js`
  - Field used: `room` (stores room number as string)
  - Note: Use `student.room`, NOT `student.roomNumber`
  
- **File**: `server/models/Room.js`
  - Fields:
    - `roomNumber`: String (e.g., "101", "205")
    - `floor`: Number (0-12)
    - `capacity`: Number (default: 3)
    - `occupants`: Array of Student ObjectIds
    - `allocatedStudents`: Array of Student ObjectIds (same as occupants)

### 8. **Middleware**
- **File**: `server/middleware/verifyAdminMiddleware.js`
- **Purpose**: Verify admin token for protected operations

---

## 🔧 Helper Functions

### `extractFloorNumber(roomNumber)`
- **Location**: `server/services/roomSyncService.js`
- **Purpose**: Extract floor number from room number
- **Examples**:
  - `'001'` → `0` (ground floor)
  - `'101'` → `1` (floor 1)
  - `'939'` → `9` (floor 9)
  - `'1001'` → `10` (floor 10)
  - `'1201'` → `12` (floor 12)

---

## ⚠️ Common Errors & Solutions

### 1. **"Cannot read properties of null (reading 'toString')"**
- **Cause**: Some students have `null` or invalid room values
- **Solution**: ✅ **FIXED** - Added safety checks in the grouping logic
- **Status**: Now automatically skips students with invalid room assignments

### 2. **"Room not found"**
- **Cause**: Room doesn't exist in Room collection
- **Solution**: ✅ **FIXED** - Sync process automatically creates missing rooms

### 3. **Only floors 9-12 showing students**
- **Cause**: Field name mismatch (`roomNumber` vs `room`)
- **Solution**: ✅ **FIXED** - All API endpoints updated to use `student.room`

### 4. **Capacity warnings**
- **Cause**: More students assigned to a room than its capacity
- **Solution**: ✅ Logged as warning but still synced (admin can fix later)

### 5. **Students not sorted by room number**
- **Cause**: String sorting instead of numeric sorting
- **Solution**: ✅ **FIXED** - Implemented numeric sorting at backend and frontend

### 6. **Rooms not syncing immediately after changes**
- **Cause**: Manual sync button required
- **Solution**: ✅ **FIXED** - Automatic syncing after every student operation

---

## 🎯 Data Flow in Database

### Automatic Sync Example:

```
Before Operation:
StudentModel:
  { _id: "s1", name: "John", room: "101", is_active: true }
  { _id: "s2", name: "Jane", room: "101", is_active: true }

Room Model:
  { roomNumber: "101", occupants: ["s1", "s2"], capacity: 3 }

Operation: Register new student "Bob" in room "101"
  ↓
Backend: Creates student s3 with room "101"
  ↓
Backend: Calls syncSingleRoom("101")
  ↓
Room Model Updated:
  { roomNumber: "101", occupants: ["s1", "s2", "s3"], capacity: 3 }

Result: Room automatically reflects new occupant ✅
```

---

## 🚀 How Syncing Works Now

### **🔴 Real-Time Syncing (PRIMARY - Always Active)**
✅ **Happens instantly** via MongoDB Change Streams:
- Watches Student collection 24/7
- Detects changes in < 100ms
- Syncs affected rooms immediately
- **Works for ALL data sources:**
  - ✅ API endpoint calls
  - ✅ MongoDB Compass manual edits
  - ✅ Bulk import scripts
  - ✅ Database migrations
  - ✅ External database tools
  - ✅ Any database modification

**Benefits:**
- 🚀 **Instant updates** - No page reload needed
- 🔄 **Universal** - Catches ALL database changes
- ⚡ **Efficient** - Only syncs affected rooms
- 🛡️ **Reliable** - Auto-reconnects on errors
- 🎯 **Precise** - Knows exactly what changed

**Example Real-Time Flow:**
```
1. You edit student room in MongoDB Compass: 101 → 205
   ↓ (< 100ms)
2. Change Stream detects the update
   ↓
3. Watcher extracts old room (101) and new room (205)
   ↓
4. syncSingleRoom(101) - removes student from room 101
   ↓
5. syncSingleRoom(205) - adds student to room 205
   ↓
6. Room occupants updated in database
   ↓
7. Refresh page → See updated room assignments instantly!
```

### **⚡ API-Triggered Sync (LAYER 2 - Backup)**
### **⚡ API-Triggered Sync (LAYER 2 - Backup)**
✅ **Still active** for double-safety:
- Registering a student
- Deleting/deactivating a student  
- Changing a student's room
- Updating student details (if room changes)
- Unassigning a student from a room
- Exchanging rooms between two students
- Bulk allocating unassigned students to rooms
- Generating random students with room assignments

**Purpose**: Provides redundancy in case change stream temporarily fails

### **🚀 Startup Sync (LAYER 3 - Recovery)**
✅ **Runs on server restart**:
- Full system sync of all rooms
- Catches changes made while server was down
- Ensures consistency after server restarts

### **📅 Scheduled Daily Sync (LAYER 4 - Maintenance)**
✅ **Runs daily at 2:00 AM**:
- Full system sync as maintenance backup
- Catches any edge cases or missed changes
- Provides additional safety layer

**No user action needed for ANY layer!** 🎉

### **Manual Full Sync (Emergency/Admin Use)**
🔧 Available via API endpoint only:

```bash
curl -X POST http://localhost:6201/admin-api/rooms/sync \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Use cases**:
- Database cleanup/maintenance
- After bulk imports
- Fixing data inconsistencies
- System-wide corrections

**Not needed for normal operations!**

---

## 📊 Console Logs (Real-Time Sync)

### Server Startup:
```
MongoDB connection successful!
🔄 Running room sync on server startup...
✅ Startup sync complete: 156 rooms updated, 334 students processed
🚀 Starting real-time room sync watcher...
🔍 Starting MongoDB Change Stream for real-time room syncing...
✅ Room change stream watcher started successfully
📡 Now monitoring Student collection for real-time changes...
✅ Real-time sync active - rooms will sync automatically on any student data change!
📅 Scheduled daily room sync job at 2:00 AM
```

### Real-Time Change Detection (MongoDB Compass Edit):
```
🔔 Student change detected: update
✏️  Student updated: 21CS001
🔄 Room change detected - Old: 101, New: 205, Active: true
🔄 Syncing single room: 101
✅ Room 101 synced: 2 students
🔄 Syncing single room: 205
✅ Room 205 synced: 3 students
```

### Real-Time Change Detection (New Student):
```
🔔 Student change detected: insert
📝 New student created: 21CS042
🏠 Student assigned to room: 310
🔄 Syncing single room: 310
✅ Room 310 synced: 3 students
```

### Real-Time Change Detection (Student Deletion):
```
🔔 Student change detected: delete
🗑️  Student deleted: 507f1f77bcf86cd799439011
🏠 Syncing room after student deletion: 205
🔄 Syncing single room: 205
✅ Room 205 synced: 2 students
```

### Example: Automatic Sync Example (API Endpoint):
```
🔄 Syncing single room: 101
✅ Room 101 synced: 3 students
```

### Example: Room Change
```
🔄 Syncing single room: 205 (old room)
✅ Room 205 synced: 2 students
🔄 Syncing single room: 310 (new room)
✅ Room 310 synced: 3 students
```

### Example: Full System Sync (Manual/Emergency)
```
📊 Found 334 active students with room assignments
🏠 Unique room numbers in student data: 156
✨ Created missing room 101 from student data
✨ Created missing room 102 from student data
...
🧹 Cleared all room occupants for fresh sync
✅ Updated 156 rooms with 334 student allocations

Verification by floor:
   Floor 1: 18 rooms with 42 students
   Floor 2: 15 rooms with 38 students
   Floor 3: 14 rooms with 35 students
   ...
   Floor 12: 12 rooms with 28 students

⚠️ 3 rooms exceed capacity:
   Room 101: 4 students / 3 capacity
   Room 205: 4 students / 3 capacity
   Room 309: 4 students / 3 capacity

✅ Room sync completed successfully!
```

---

## 🔍 Verification Queries

### Check if sync worked:
```javascript
// In MongoDB or using mongoose
Room.find({ occupants: { $ne: [] } }).count()
// Should return number of occupied rooms

Room.aggregate([
  { $group: { _id: "$floor", roomCount: { $sum: 1 }, studentCount: { $sum: { $size: "$occupants" } } } }
])
// Shows distribution by floor
```

---

## 📝 Key Features

1. **✅ Real-Time**: Syncs happen instantly via MongoDB Change Streams (< 100ms)
2. **🌍 Universal**: Works for ALL database changes (API, Compass, bulk imports, etc.)
3. **⚡ Automatic**: No user intervention needed - completely hands-off
4. **🎯 Precise**: Only syncs affected rooms (efficient resource usage)
5. **🔒 Reliable**: Four-layer safety net ensures data consistency
6. **🛡️ Resilient**: Auto-reconnects on errors, graceful fallback to scheduled sync
7. **� Smart**: Detects exact changes and syncs only what's needed
8. **🔍 Transparent**: Comprehensive logging for debugging and monitoring
9. **⚙️ Production-Ready**: Handles edge cases, graceful shutdowns, error recovery

---

## 🐛 Debugging Tips

1. **Check server console** for automatic sync logs after operations
2. **Verify student `room` field** values in database (not `roomNumber`)
3. **Check Room collection** for proper population after changes
4. **Look for capacity warnings** in logs
5. **Verify all floors** are represented (0-12)
6. **Monitor sync timing** - should happen immediately after operations
7. **Check backend API logs** to confirm sync function calls

---

## 🔄 Migration Notes

### What Changed in v3.0 (Real-Time Sync):
- ✅ **Added**: MongoDB Change Stream watcher for real-time syncing
- ✅ **Added**: Four-layer syncing architecture (real-time + API + startup + scheduled)
- ✅ **Added**: Graceful shutdown handlers for change stream
- ✅ **Enhanced**: Now catches ALL database modifications, not just API calls
- ❌ **Removed**: Manual "Sync Rooms" button from UI (v2.0)
- ❌ **Removed**: `handleSyncRooms()` function from frontend (v2.0)
- ❌ **Removed**: `syncingRooms` state variable (v2.0)

### What Was Added in v2.0:
- ✅ **Added**: `syncSingleRoom()` function for automatic syncing
- ✅ **Added**: Automatic sync calls in all student CRUD endpoints
- ✅ **Added**: Numeric sorting for room numbers
- ✅ **Fixed**: Field name consistency (`room` vs `roomNumber`)

### Backward Compatibility:
- ✅ Full system sync endpoint still available for emergency use
- ✅ API-triggered syncing still active as backup layer
- ✅ Existing database structure unchanged
- ✅ All existing features continue to work
- ✅ No breaking changes for API consumers

### Requirements:
- ⚠️  **MongoDB 3.6+** required for Change Streams
- ⚠️  **Replica Set** required (MongoDB Atlas provides this by default)
- ✅ If running local MongoDB, configure as replica set or change streams won't work

---

**Last Updated**: November 8, 2025  
**Status**: ✅ Real-time syncing with MongoDB Change Streams fully implemented  
**Version**: 3.0 (Real-Time Sync via Change Streams)

---

## 🎯 Real-World Scenario: The Problem Solved

### Before (v2.0 - API Syncing Only):
```
❌ User unassigns student via API → Room syncs ✅
❌ User changes room in MongoDB Compass → Room NOT synced ❌
❌ Must restart server or wait until 2 AM for sync
```

### After (v3.0 - Real-Time Change Streams):
```
✅ User unassigns student via API → Room syncs instantly ✅
✅ User changes room in MongoDB Compass → Room syncs instantly ✅
✅ Refresh page → See updated data immediately ✅
✅ No server restart needed ✅
✅ No waiting until 2 AM ✅
```

**The Solution**: MongoDB Change Streams watch the database 24/7 and trigger syncing on ANY change, regardless of the source!

---

## 📚 Additional Resources

- **Change Stream Watcher**: `server/services/roomChangeStreamWatcher.js` 🆕
- **Service File**: `server/services/roomSyncService.js`
- **Scheduler**: `server/jobs/roomSyncScheduler.js`
- **Server Entry**: `server/server.js`
- **API File**: `server/APIs/adminAPI.js`
- **Frontend**: `frontend/src/components/admin/Students.jsx`, `Rooms.jsx`
- **Models**: `server/models/StudentModel.js`, `server/models/Room.js`

## 🚨 Important Notes

### MongoDB Requirements:
1. **Replica Set Required**: Change Streams only work with MongoDB replica sets
   - ✅ MongoDB Atlas (cloud) - Has replica sets by default
   - ⚠️  Local MongoDB - Must configure as replica set
   
2. **Version Requirements**: 
   - MongoDB 3.6+ for basic Change Streams
   - MongoDB 6.0+ for `fullDocumentBeforeChange` (recommended)

3. **If Change Streams Can't Start**:
   - System falls back to API-triggered + scheduled syncing
   - Warning logged: "Failed to start change stream watcher"
   - Scheduled sync at 2 AM provides backup consistency

### Testing the System:
1. **Test Real-Time Sync**: 
   - Edit student room in MongoDB Compass
   - Wait 1-2 seconds
   - Refresh frontend page
   - ✅ Should see updated room occupants immediately

2. **Check Console Logs**:
   - Look for "Student change detected" messages
   - Verify sync logs show affected rooms
   - Confirm no errors in change stream

3. **Monitor Performance**:
   - Change streams are efficient (minimal overhead)
   - Only affected rooms are synced (not entire system)
   - No polling = no unnecessary database queries
