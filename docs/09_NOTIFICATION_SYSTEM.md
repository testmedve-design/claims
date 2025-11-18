# Claims Notification System - Complete Documentation

## 📋 Overview

The Claims Notification System provides real-time notifications for all claim-related events. It handles both external API calls to a notification service and internal Firestore storage for in-app notifications.

**Module**: `backend/utils/notification_client.py`  
**Collection**: `claims_notifications` (Firestore)  
**External Service**: Configurable via `NOTIFICATION_SERVICE_URL`

**Status**: ✅ **FULLY IMPLEMENTED**

---

## 🏗️ Architecture

```
Claim Event → Notification Client → External API (Optional)
                    ↓
          Firestore Storage (Always)
                    ↓
           Frontend Notification UI
```

### Components

1. **NotificationClient**: Python class for sending notifications
2. **Firestore Collection**: Stores all notifications for in-app display
3. **External Service**: Optional external notification service
4. **Cleanup System**: Auto-cleanup of expired notifications

---

## 🔧 Configuration

### Environment Variables

```bash
# Optional - External notification service
NOTIFICATION_SERVICE_URL=http://notification-service:8080

# If not set, notifications are only stored in Firestore
```

### Setup

```python
from utils.notification_client import get_notification_client

# Get singleton instance
notification_client = get_notification_client()
```

---

## 📡 Notification Events

### 1. Claim Pending (Submitted)

Triggered when hospital submits a new claim.

**Event Type**: `claim_pending`  
**Recipients**: Claim Processors  
**Status**: `qc_pending`

```python
notification_client.notify_pending(
    claim_id="CSHLSIP-2025-001",
    claim_data={
        'hospital_name': 'City Hospital',
        'form_data': {
            'patient_name': 'John Doe',
            'claimed_amount': 45000,
            'payer_name': 'Health Insurance Ltd'
        }
    },
    actor_id="hospital_user_uid",
    actor_name="Hospital User",
    actor_email="user@hospital.com"
)
```

**Notification Stored**:
```json
{
  "claim_id": "CSHLSIP-2025-001",
  "event_type": "claim_pending",
  "title": "Claim Submitted",
  "message": "City Hospital submitted claim CSHLSIP-2025-001.",
  "recipients": [
    {
      "user_id": "processor_uid",
      "user_email": "processor@medverve.com",
      "user_role": "claim_processor"
    }
  ],
  "metadata": {
    "status": "qc_pending"
  },
  "triggered_by": {
    "actor_id": "hospital_user_uid",
    "actor_role": "hospital_user",
    "actor_name": "Hospital User",
    "actor_email": "user@hospital.com"
  },
  "delivery_success": true,
  "read_by": [],
  "created_at": "2025-01-15T10:30:00Z"
}
```

---

### 2. QC Query Raised

Triggered when processor raises a query on a claim.

**Event Type**: `claim_qc_query`  
**Recipients**: Hospital Users  
**Status**: `qc_query`

```python
notification_client.notify_qc_query(
    claim_id="CSHLSIP-2025-001",
    claim_data=claim_data,
    processor_id="processor_uid",
    processor_name="Processor Name",
    processor_email="processor@medverve.com",
    remarks="Missing discharge summary",
    qc_query_details={
        'missing_documents': ['discharge_summary'],
        'query_category': 'documentation'
    }
)
```

**Notification Stored**:
```json
{
  "claim_id": "CSHLSIP-2025-001",
  "event_type": "claim_qc_query",
  "title": "QC Query Raised",
  "message": "Processor Name raised a QC query on claim CSHLSIP-2025-001.",
  "recipients": [
    {
      "user_id": "hospital_user_uid",
      "user_email": "user@hospital.com",
      "user_role": "hospital_user"
    }
  ],
  "metadata": {
    "status": "qc_query",
    "remarks": "Missing discharge summary",
    "qc_query_details": {
      "missing_documents": ["discharge_summary"],
      "query_category": "documentation"
    }
  },
  "triggered_by": {
    "actor_id": "processor_uid",
    "actor_role": "processor",
    "actor_name": "Processor Name",
    "actor_email": "processor@medverve.com"
  }
}
```

---

### 3. QC Query Answered

Triggered when hospital answers a processor query.

**Event Type**: `claim_qc_answered`  
**Recipients**: Claim Processors  
**Status**: `qc_answered`

```python
notification_client.notify_qc_answered(
    claim_id="CSHLSIP-2025-001",
    claim_data=claim_data,
    hospital_user_id="hospital_user_uid",
    hospital_user_name="Hospital User",
    hospital_user_email="user@hospital.com",
    query_response="Discharge summary has been uploaded",
    uploaded_files=["doc_123"]
)
```

---

### 4. Need More Info

Triggered when processor requests additional information.

**Event Type**: `claim_need_more_info`  
**Recipients**: Hospital Users  
**Status**: `need_more_info`

```python
notification_client.notify_need_more_info(
    claim_id="CSHLSIP-2025-001",
    claim_data=claim_data,
    processor_id="processor_uid",
    processor_name="Processor Name",
    processor_email="processor@medverve.com",
    remarks="Please provide pre-authorization letter"
)
```

---

### 5. Need More Info Response

Triggered when hospital provides additional information.

**Event Type**: `claim_need_more_info_response`  
**Recipients**: Claim Processors  
**Status**: `need_more_info_submitted`

```python
notification_client.notify_need_more_info_response(
    claim_id="CSHLSIP-2025-001",
    claim_data=claim_data,
    hospital_user_id="hospital_user_uid",
    hospital_user_name="Hospital User",
    hospital_user_email="user@hospital.com",
    response="Pre-authorization letter uploaded",
    uploaded_files=["doc_124", "doc_125"]
)
```

---

### 6. Claim Contested

Triggered when hospital contests a denied claim.

**Event Type**: `claim_contested`  
**Recipients**: Claim Processors  
**Status**: `claim_contested`

```python
notification_client.notify_claim_contested(
    claim_id="CSHLSIP-2025-001",
    claim_data=claim_data,
    hospital_user_id="hospital_user_uid",
    hospital_user_name="Hospital User",
    hospital_user_email="user@hospital.com",
    contest_reason="Claim was wrongly rejected",
    uploaded_files=["doc_126"]
)
```

---

### 7. QC Clear

Triggered when processor clears a claim in QC.

**Event Type**: `claim_qc_clear`  
**Recipients**: Hospital Users  
**Status**: `qc_clear`

```python
notification_client.notify_qc_clear(
    claim_id="CSHLSIP-2025-001",
    claim_data=claim_data,
    processor_id="processor_uid",
    processor_name="Processor Name",
    processor_email="processor@medverve.com",
    remarks="All documents verified successfully"
)
```

---

### 8. Claim Approved

Triggered when processor approves a claim.

**Event Type**: `claim_approved`  
**Recipients**: Hospital Users  
**Status**: `claim_approved`

```python
notification_client.notify_approved(
    claim_id="CSHLSIP-2025-001",
    claim_data=claim_data,
    processor_id="processor_uid",
    processor_name="Processor Name",
    processor_email="processor@medverve.com",
    remarks="Claim approved for payment"
)
```

---

### 9. Claim Denied

Triggered when processor denies/rejects a claim.

**Event Type**: `claim_denied`  
**Recipients**: Hospital Users  
**Status**: `claim_denial`

```python
notification_client.notify_denial(
    claim_id="CSHLSIP-2025-001",
    claim_data=claim_data,
    processor_id="processor_uid",
    processor_name="Processor Name",
    processor_email="processor@medverve.com",
    remarks="Claim denied due to policy exclusions",
    rejection_reason="Pre-existing condition not covered"
)
```

---

## 📊 Data Structures

### Notification Document (Firestore)

```typescript
interface NotificationDocument {
  // Identifiers
  claim_id: string;
  event_type: string;
  
  // Content
  title: string;
  message: string;
  
  // Recipients
  recipients: Recipient[];
  recipient_ids: string[];
  recipient_roles: string[];
  
  // Metadata
  metadata: {
    status?: string;
    remarks?: string;
    [key: string]: any;
  };
  
  // Triggered by
  triggered_by: {
    actor_id: string;
    actor_role: string;
    actor_name: string;
    actor_email: string;
  };
  
  // Delivery status
  delivery_success: boolean;
  
  // Read tracking
  read_by: string[];
  
  // Timestamps
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

### Recipient Object

```typescript
interface Recipient {
  user_id: string;
  user_email: string;
  user_role: string;
  user_name?: string;
}
```

---

## 🔧 Helper Functions

### 1. Get Hospital Users

Get all users for a specific hospital.

```python
from utils.notification_helpers import get_hospital_users

hospital_users = get_hospital_users(hospital_id="HOSP_001")
# Returns: List[Dict] with user_id, user_email, user_role
```

**Implementation**:
```python
def get_hospital_users(hospital_id: str) -> List[Dict]:
    """Get all users assigned to a hospital"""
    db = get_firestore()
    users = []
    
    # Query users collection
    users_ref = db.collection('users')
    query = users_ref.where('entity_assignments.hospitals', 'array_contains', {
        'id': hospital_id
    })
    
    for doc in query.stream():
        user_data = doc.to_dict()
        users.append({
            'user_id': doc.id,
            'user_email': user_data.get('email'),
            'user_role': user_data.get('role'),
            'user_name': user_data.get('displayName')
        })
    
    return users
```

---

### 2. Get Processors for Claim

Get all processors who can handle a specific claim.

```python
from utils.notification_helpers import get_processors_for_claim

processors = get_processors_for_claim(claim_id, claim_data)
# Returns: List[Dict] with user_id, user_email, user_role
```

**Implementation**:
```python
def get_processors_for_claim(claim_id: str, claim_data: Dict) -> List[Dict]:
    """Get processors who can process this claim"""
    db = get_firestore()
    processors = []
    
    hospital_id = claim_data.get('hospital_id')
    
    # Query processor users
    users_ref = db.collection('users')
    query = users_ref.where('role', 'in', [
        'claim_processor',
        'claim_processor_l1',
        'claim_processor_l2',
        'claim_processor_l3',
        'claim_processor_l4'
    ])
    
    for doc in query.stream():
        user_data = doc.to_dict()
        
        # Check if processor is assigned to this hospital
        entity_assignments = user_data.get('entity_assignments', {})
        assigned_hospitals = entity_assignments.get('hospitals', [])
        
        if any(h.get('id') == hospital_id for h in assigned_hospitals):
            processors.append({
                'user_id': doc.id,
                'user_email': user_data.get('email'),
                'user_role': user_data.get('role'),
                'user_name': user_data.get('displayName')
            })
    
    return processors
```

---

### 3. Cleanup Expired Notifications

Automatically cleanup old notifications (default: 30 days).

```python
from utils.notification_cleanup import cleanup_expired_notifications

# Cleanup notifications older than 30 days
deleted_count = cleanup_expired_notifications(ttl_hours=720)
print(f"Deleted {deleted_count} expired notifications")
```

**Implementation**:
```python
def cleanup_expired_notifications(
    ttl_hours: int = 720,  # 30 days
    db_override=None
) -> int:
    """Delete notifications older than TTL"""
    db = db_override or get_firestore()
    
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=ttl_hours)
    
    query = db.collection('claims_notifications').where(
        'created_at', '<', cutoff_time
    )
    
    deleted_count = 0
    for doc in query.stream():
        doc.reference.delete()
        deleted_count += 1
    
    return deleted_count
```

---

## 🎨 Frontend Integration

### 1. Fetch User Notifications

```typescript
// /services/notificationApi.ts
export const fetchNotifications = async (userId: string) => {
  const token = localStorage.getItem('auth_token');
  
  const db = firebase.firestore();
  const notifications = await db.collection('claims_notifications')
    .where('recipient_ids', 'array-contains', userId)
    .orderBy('created_at', 'desc')
    .limit(50)
    .get();
  
  return notifications.docs.map(doc => ({
    id: doc.id,
    ...doc.to_dict()
  }));
};
```

---

### 2. Mark Notification as Read

```typescript
export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
) => {
  const db = firebase.firestore();
  
  await db.collection('claims_notifications')
    .doc(notificationId)
    .update({
      read_by: firebase.firestore.FieldValue.arrayUnion(userId),
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    });
};
```

---

### 3. Notification Component

```typescript
// /components/NotificationBell.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    
    // Real-time listener
    const unsubscribe = firebase.firestore()
      .collection('claims_notifications')
      .where('recipient_ids', 'array-contains', userId)
      .orderBy('created_at', 'desc')
      .limit(10)
      .onSnapshot((snapshot) => {
        const notifs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.to_dict()
        }));
        setNotifications(notifs);
        
        const unread = notifs.filter(n => !n.read_by.includes(userId));
        setUnreadCount(unread.length);
      });
    
    return () => unsubscribe();
  }, [userId]);

  const loadNotifications = async () => {
    const notifs = await fetchNotifications(userId);
    setNotifications(notifs);
    
    const unread = notifs.filter(n => !n.read_by.includes(userId));
    setUnreadCount(unread.length);
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read_by.includes(userId)) {
      await markNotificationAsRead(notification.id, userId);
    }
    
    // Navigate to claim
    window.location.href = `/claims/${notification.claim_id}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2">
          <h3 className="font-semibold mb-2">Notifications</h3>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500">No notifications</p>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`cursor-pointer ${
                  !notification.read_by.includes(userId) ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="font-medium">{notification.title}</div>
                  <div className="text-sm text-gray-600">{notification.message}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(notification.created_at).toLocaleString()}
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 🔒 Security Considerations

1. **Recipient Filtering**: Only users in `recipient_ids` can see notifications
2. **Role-Based Access**: Notifications filtered by user role
3. **Entity Assignments**: Recipients based on assigned hospitals/payers
4. **PII Protection**: Sensitive data not stored in notifications
5. **Audit Trail**: All notifications logged with triggered_by info

---

## 📈 Monitoring & Debugging

### Check Notification Delivery

```python
# Check if notification was sent
db = get_firestore()
notifications = db.collection('claims_notifications')\
    .where('claim_id', '==', 'CSHLSIP-2025-001')\
    .stream()

for notif in notifications:
    data = notif.to_dict()
    print(f"Event: {data['event_type']}")
    print(f"Delivered: {data['delivery_success']}")
    print(f"Recipients: {len(data['recipients'])}")
```

### Debug Recipient Calculation

```python
# Check who would receive notifications
processors = get_processors_for_claim(claim_id, claim_data)
print(f"Processors: {len(processors)}")
for p in processors:
    print(f"  - {p['user_email']} ({p['user_role']})")

hospital_users = get_hospital_users(hospital_id)
print(f"Hospital Users: {len(hospital_users)}")
for u in hospital_users:
    print(f"  - {u['user_email']} ({u['user_role']})")
```

---

## 🚀 Best Practices

1. **Always call notification methods** after successful claim status updates
2. **Provide descriptive remarks** for better notification messages
3. **Include relevant metadata** for filtering and display
4. **Handle notification failures gracefully** (don't block main flow)
5. **Cleanup old notifications** periodically (cron job)
6. **Test notification recipients** before deploying changes
7. **Log notification delivery** for audit trail
8. **Use real-time listeners** in frontend for instant updates
9. **Implement read receipts** for user engagement tracking
10. **Add notification preferences** for user customization

---

## 🔧 Configuration Options

### Notification TTL

```python
# Default: 30 days (720 hours)
DEFAULT_NOTIFICATION_TTL_HOURS = 720

# Custom cleanup
cleanup_expired_notifications(ttl_hours=168)  # 7 days
```

### External Service URL

```python
# config.py
class Config:
    NOTIFICATION_SERVICE_URL = os.environ.get(
        'NOTIFICATION_SERVICE_URL',
        ''  # Empty = Firestore only
    )
```

---

## 📝 Event Type Reference

| Event Type | Trigger | Recipients | Status |
|------------|---------|------------|--------|
| `claim_pending` | Claim submitted | Processors | `qc_pending` |
| `claim_qc_query` | Query raised | Hospital Users | `qc_query` |
| `claim_qc_answered` | Query answered | Processors | `qc_answered` |
| `claim_need_more_info` | More info requested | Hospital Users | `need_more_info` |
| `claim_need_more_info_response` | Info provided | Processors | `qc_answered` |
| `claim_contested` | Claim contested | Processors | `claim_contested` |
| `claim_qc_clear` | QC cleared | Hospital Users | `qc_clear` |
| `claim_approved` | Claim approved | Hospital Users | `claim_approved` |
| `claim_denied` | Claim rejected | Hospital Users | `claim_denial` |

---

## 📞 Support

For notification system issues:
- Check Firestore `claims_notifications` collection
- Verify user `entity_assignments`
- Check external service logs if configured
- Review notification delivery_success flag
- Contact backend team for integration issues

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: ✅ FULLY IMPLEMENTED

---


