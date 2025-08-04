import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { initializeData } from "~/lib/financial-utils";

export function CategoriesList() {
  const data = initializeData();
  const { categories } = data;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-emerald-400">
            Income Categories (Revenue Streams)
          </CardTitle>
          <CardDescription>
            Categories that create revenue streams for expense allocation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories
              .filter((c) => c.type === "income")
              .map((category) => (
                <div
                  key={category.id}
                  className="flex items-center space-x-3 rounded-lg p-2"
                >
                  <div className={`h-4 w-4 rounded-full ${category.color}`} />
                  <span className="font-medium">{category.name}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-rose-400">Expense Categories</CardTitle>
          <CardDescription>
            Categories for expenses that get allocated to revenue streams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories
              .filter((c) => c.type === "expense")
              .map((category) => (
                <div
                  key={category.id}
                  className="flex items-center space-x-3 rounded-lg p-2"
                >
                  <div className={`h-4 w-4 rounded-full ${category.color}`} />
                  <span className="font-medium">{category.name}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Skeleton component for loading state
export function CategoriesListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="glass">
          <CardHeader>
            <div className="bg-muted/30 mb-2 h-6 w-48 animate-pulse rounded"></div>
            <div className="bg-muted/30 h-4 w-64 animate-pulse rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <div
                  key={j}
                  className="flex items-center space-x-3 rounded-lg p-2"
                >
                  <div className="bg-muted/30 h-4 w-4 animate-pulse rounded-full"></div>
                  <div className="bg-muted/30 h-4 w-24 animate-pulse rounded"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
