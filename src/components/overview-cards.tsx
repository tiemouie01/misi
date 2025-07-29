import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { LucideIcon } from "lucide-react";

interface OverviewCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  valueColor: string;
}

export function OverviewCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  valueColor,
}: OverviewCardProps) {
  return (
    <Card className="frosted border-0 transition-transform duration-300 hover:scale-105">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
        <div className={`rounded-lg ${iconColor} p-2`}>
          <Icon className={`h-4 w-4 ${valueColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
      </CardContent>
    </Card>
  );
}

interface OverviewCardsGridProps {
  cards: OverviewCardProps[];
}

export function OverviewCardsGrid({ cards }: OverviewCardsGridProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <OverviewCard key={index} {...card} />
      ))}
    </div>
  );
}
