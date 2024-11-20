import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { DollarSign, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  totalValue: string;
  totalStreams: number;
}

export function StatsCards({ totalValue, totalStreams }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="glass-card">
        <CardContent className="p-4 flex items-center space-x-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">{totalValue}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-4 flex items-center space-x-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Streams</p>
            <p className="text-2xl font-bold">{totalStreams}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}