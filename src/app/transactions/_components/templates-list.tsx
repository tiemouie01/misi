import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Edit, Trash2, ArrowRight, Zap, Droplets } from "lucide-react";
import type { TransactionTemplate } from "~/server/db/schema";

interface TemplatesListProps {
  templates: TransactionTemplate[];
  categories: {
    id: string;
    name: string;
    type: "income" | "expense";
    color: string;
  }[];
  onEditTemplate: (template: TransactionTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onUseTemplate: (template: TransactionTemplate) => void;
}

export function TemplatesList({
  templates,
  categories,
  onEditTemplate,
  onDeleteTemplate,
  onUseTemplate,
}: TemplatesListProps) {
  const getCategoryColor = (categoryName: string) =>
    categories.find((c) => c.name === categoryName)?.color ?? "bg-slate-400";

  if (templates.length === 0) {
    return (
      <Card className="glass">
        <CardContent className="py-8 text-center">
          <div className="bg-muted/30 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full p-4">
            <Droplets className="h-8 w-8" />
          </div>
          <p className="text-muted-foreground mb-4">
            No templates created yet.
          </p>
          <p className="text-muted-foreground text-sm">
            Create templates for common transactions with pre-allocated revenue
            streams.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card
          key={template.id}
          className="glass transition-transform duration-300 hover:scale-[1.02]"
        >
          <CardContent className="p-4">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className={`h-3 w-3 rounded-full ${getCategoryColor(template.categoryName)}`}
                />
                <Badge
                  variant={
                    template.type === "income" ? "default" : "destructive"
                  }
                  className="text-xs"
                >
                  {template.type}
                </Badge>
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditTemplate(template)}
                  className="glass"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteTemplate(template.id)}
                  className="glass"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">{template.description}</h3>
              <p className="text-muted-foreground text-sm">
                {template.categoryName}
              </p>
              {template.revenueStream && (
                <div className="text-muted-foreground flex items-center space-x-1 text-sm">
                  <ArrowRight className="h-3 w-3" />
                  <span>{template.revenueStream}</span>
                </div>
              )}
              <div
                className={`text-lg font-bold ${template.type === "income" ? "text-emerald-400" : "text-rose-400"}`}
              >
                {template.type === "income" ? "+" : "-"}$
                {Number(template.amount).toFixed(2)}
              </div>
            </div>

            <Button
              className="glass-card mt-3 w-full border-0"
              size="sm"
              onClick={() => onUseTemplate(template)}
            >
              <Zap className="mr-2 h-4 w-4" />
              Quick Add
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Skeleton component for loading state
export function TemplatesListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="glass">
          <CardContent className="p-4">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="bg-muted/30 h-3 w-3 animate-pulse rounded-full"></div>
                <div className="bg-muted/30 h-5 w-16 animate-pulse rounded"></div>
              </div>
              <div className="flex space-x-1">
                <div className="bg-muted/30 h-6 w-6 animate-pulse rounded"></div>
                <div className="bg-muted/30 h-6 w-6 animate-pulse rounded"></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="bg-muted/30 h-5 w-32 animate-pulse rounded"></div>
              <div className="bg-muted/30 h-4 w-24 animate-pulse rounded"></div>
              <div className="bg-muted/30 h-4 w-28 animate-pulse rounded"></div>
              <div className="bg-muted/30 h-6 w-20 animate-pulse rounded"></div>
            </div>

            <div className="bg-muted/30 mt-3 h-8 animate-pulse rounded"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
