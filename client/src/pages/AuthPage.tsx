import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  code: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: ''
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) throw new Error('Invalid code');
      
      const { token } = await res.json();
      localStorage.setItem('token', token);
      setLocation('/browse');
    } catch (err) {
      toast({
        title: "Error",
        description: "Invalid access code",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center space-y-6">
          <div className="flex flex-col items-center">
            <img 
              src="/CineFlix+.png" 
              alt="CineFlix+" 
              className="w-64 h-auto mb-4"
              loading="eager"
            />
          </div>
          <p className="text-muted-foreground">Enter your access code to continue</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter code..." 
                      {...field}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
