'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ValidateOfferButtonProps {
  offerId: string
}

export function ValidateOfferButton({ offerId }: ValidateOfferButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleValidate = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('offers')
        .update({
          is_validated: true,
          validated_by: user?.id ?? null,
          validated_at: new Date().toISOString(),
          // Clear any previous rejection
          rejected_by: null,
          rejected_at: null,
        })
        .eq('id', offerId)

      if (error) throw error

      toast.success('Oferta validada correctamente')
      router.refresh()
    } catch (err: any) {
      toast.error('Error al validar la oferta', { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleValidate}
      disabled={loading}
      className="bg-green-600 hover:bg-green-700 text-white"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <CheckCircle className="h-4 w-4 mr-2" />
      )}
      Validar Oferta
    </Button>
  )
}
