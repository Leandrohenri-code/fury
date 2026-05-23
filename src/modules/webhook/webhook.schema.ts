import { z } from 'zod'

export const violationSchema = z.object({
  adId: z.string().min(1),
  tenantId: z.string().min(1),
  violationType: z.enum(['PROHIBITED_TERM', 'BRAND_VIOLATION', 'COMPLIANCE_FAIL']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  detectedAt: z.string().datetime(),
})

export type ViolationPayload = z.infer<typeof violationSchema>
