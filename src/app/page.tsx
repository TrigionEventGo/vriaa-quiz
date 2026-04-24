import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">
            Quiz Night
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Marion &amp; Ronald
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground">
            Welkom bij de interactieve quiz! Voer je naam in om mee te doen.
          </p>
          <Button size="lg" className="w-full text-lg" disabled>
            Doe mee (binnenkort)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
