import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Crown } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background to-background" />
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md text-center border-primary/20">
        <CardContent className="pt-12 pb-8 px-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Crown className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-6xl font-bold text-gradient-gold mb-4">404</h1>
          <h2 className="text-xl font-semibold mb-2">Sayfa Bulunamadı</h2>
          <p className="text-muted-foreground mb-8">
            Aradığınız sayfa mevcut değil veya taşınmış olabilir.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/">
              <Button className="gap-2 w-full sm:w-auto" data-testid="button-go-home">
                <Home className="w-4 h-4" />
                Ana Sayfaya Git
              </Button>
            </Link>
            <Button
              variant="outline"
              className="gap-2 w-full sm:w-auto"
              onClick={() => window.history.back()}
              data-testid="button-go-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Geri Dön
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
