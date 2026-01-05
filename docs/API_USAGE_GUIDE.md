# การใช้งาน API Wrapper และ Error Handling ใหม่

## สำหรับ Components

### 1. การใช้งานพื้นฐาน

```typescript
import { getItems } from '@/lib/firestore'
import { unwrapOr, handleResponse } from '@/lib/api-helpers'

// วิธีที่ 1: ใช้ unwrapOr (แนะนำ)
const result = await getItems()
const items = unwrapOr(result, [])

// วิธีที่ 2: ใช้ handleResponse
const result = await getItems()
handleResponse(result, {
  onSuccess: (data) => {
    setItems(data.items)
  },
  onError: (error) => {
    toast.error(error)
  }
})

// วิธีที่ 3: ตรวจสอบเอง
const result = await getItems()
if (result.success && result.data) {
  setItems(result.data.items)
} else {
  toast.error(result.error)
}
```

### 2. การจัดการ Loading และ Error States

```typescript
const [items, setItems] = useState<Item[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  const fetchItems = async () => {
    setLoading(true)
    setError(null)
    
    const result = await getItems()
    
    if (result.success && result.data) {
      setItems(result.data.items)
    } else {
      setError(result.error || 'Failed to load items')
    }
    
    setLoading(false)
  }
  
  fetchItems()
}, [])

// ใน JSX
if (loading) return <LoadingSkeleton />
if (error) return <ErrorMessage message={error} />
return <ItemList items={items} />
```

### 3. การใช้กับ React Query

```typescript
import { useQuery } from '@tanstack/react-query'
import { getItems } from '@/lib/firestore'
import { unwrapOr } from '@/lib/api-helpers'

function ItemsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const result = await getItems()
      // unwrapOr จะ return default value ถ้า error
      return unwrapOr(result, { items: [], lastDoc: null, hasMore: false })
    }
  })
  
  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorMessage message={error.message} />
  
  return <ItemList items={data.items} />
}
```

## สำหรับ Server Actions / API Routes

### การสร้าง API Route ใหม่

```typescript
// app/api/items/route.ts
import { NextResponse } from 'next/server'
import { getItems } from '@/lib/firestore'

export async function GET(request: Request) {
  const result = await getItems()
  
  if (result.success && result.data) {
    return NextResponse.json(result.data)
  } else {
    return NextResponse.json(
      { error: result.error },
      { status: 500 }
    )
  }
}
```

## ตัวอย่างการ Migrate Component เดิม

### ก่อน (เดิม)

```typescript
const fetchItems = async () => {
  try {
    setLoading(true)
    const data = await getItems() // เดิม return data โดยตรง
    setItems(data)
  } catch (error) {
    console.error(error)
    toast.error('Failed to load items')
  } finally {
    setLoading(false)
  }
}
```

### หลัง (ใหม่)

```typescript
const fetchItems = async () => {
  setLoading(true)
  const result = await getItems() // ตอนนี้ return ApiResponse
  
  if (result.success && result.data) {
    setItems(result.data.items)
  } else {
    toast.error(result.error || 'Failed to load items')
  }
  
  setLoading(false)
}
```

## Helper Functions ที่มีให้ใช้

### unwrapOr
ดึงข้อมูลออกมา หรือใช้ค่า default ถ้า error
```typescript
const items = unwrapOr(result, [])
```

### unwrap
ดึงข้อมูลออกมา หรือ throw error
```typescript
try {
  const item = unwrap(result)
} catch (error) {
  toast.error(error.message)
}
```

### isSuccess / isError
ตรวจสอบสถานะ
```typescript
if (isSuccess(result)) {
  console.log(result.data) // TypeScript รู้ว่า data ไม่ใช่ null
}
```

### handleResponse
จัดการ response ด้วย callbacks
```typescript
handleResponse(result, {
  onSuccess: (data) => setItems(data),
  onError: (error) => toast.error(error)
})
```

### combineResponses
รวม multiple responses
```typescript
const [items, users] = await Promise.all([getItems(), getUsers()])
const combined = combineResponses({ items, users })

if (combined.success) {
  console.log(combined.data.items, combined.data.users)
}
```

## Performance Monitoring

### ดู Performance Metrics ใน Development

เปิด Browser Console แล้วพิมพ์:

```javascript
// ดู summary ของทุก operations
window.__performanceMonitor.getSummary()

// ดู insights
window.__getPerformanceInsights()

// ดู slow operations
window.__getPerformanceInsights().slowOperations

// ดู recent errors
window.__getPerformanceInsights().recentErrors

// Clear metrics
window.__performanceMonitor.clear()
```

### ตัวอย่าง Output

```javascript
{
  getItems: {
    count: 15,
    avgDuration: 245.67,
    errorRate: 0,
    slowest: 450.23,
    fastest: 123.45
  },
  getItemById: {
    count: 8,
    avgDuration: 89.12,
    errorRate: 12.5,
    slowest: 234.56,
    fastest: 45.67
  }
}
```

## Timeout Configuration

Functions ต่างๆ มี timeout ตามประเภท:

- **QUICK** (5s): getItemById, single document reads
- **STANDARD** (10s): getItems, updates, deletes
- **HEAVY** (30s): batch operations, complex queries
- **UPLOAD** (60s): file uploads

ถ้า operation timeout จะได้ error message ที่ชัดเจน:
```
"getItems timeout after 10000ms"
```

## Best Practices

1. **ใช้ unwrapOr สำหรับ default values**
   ```typescript
   const items = unwrapOr(result, [])
   ```

2. **ใช้ handleResponse สำหรับ side effects**
   ```typescript
   handleResponse(result, {
     onSuccess: (data) => {
       setItems(data)
       toast.success('Loaded successfully')
     },
     onError: (error) => toast.error(error)
   })
   ```

3. **ตรวจสอบ success ก่อนใช้ data**
   ```typescript
   if (result.success && result.data) {
     // ใช้ result.data ได้อย่างปลอดภัย
   }
   ```

4. **แสดง error message ให้ user เห็น**
   ```typescript
   if (!result.success) {
     toast.error(result.error || 'Something went wrong')
   }
   ```

5. **ใช้ React Query สำหรับ caching**
   ```typescript
   const { data } = useQuery({
     queryKey: ['items'],
     queryFn: async () => unwrapOr(await getItems(), { items: [], lastDoc: null, hasMore: false })
   })
   ```
