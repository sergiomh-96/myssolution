import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">Check Your Email</CardTitle>
          <CardDescription>
            We've sent you a confirmation email. Please click the link in the email to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-center text-muted-foreground space-y-2">
            <p>Didn't receive the email? Check your spam folder.</p>
          </div>
          <Button asChild className="w-full">
            <Link href="/auth/login">Back to Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
