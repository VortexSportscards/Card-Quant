import { useState, useMemo } from 'react';
import { ViewType, Stream } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatTime, calculateStreamDuration, calculateTotalCost, calculateGrossProfit } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface MyStreamsProps {
  streams: Stream[];
  onViewChange: (view: ViewType) => void;
}

export default function MyStreams({ streams, onViewChange }: MyStreamsProps) {
  const { user } = useAuth();
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);

  const myStreams = useMemo(() => {
    if (!user?.streamerId) return [];
    return streams.filter(stream => stream.streamerId === user.streamerId);
  }, [streams, user]);

  const stats = useMemo(() => {
    if (!myStreams.length) return null;

    const totalSales = myStreams.reduce((sum, stream) => sum + (stream.totalSales || 0), 0);
    const totalCost = myStreams.reduce((sum, stream) => sum + calculateTotalCost(stream.soldItems), 0);
    const totalProfit = calculateGrossProfit(totalSales, totalCost);
    const averageSales = totalSales / myStreams.length;

    const platformStats = myStreams.reduce((acc, stream) => {
      acc[stream.platform] = (acc[stream.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bestPlatform = Object.entries(platformStats).sort((a, b) => b[1] - a[1])[0][0];

    return {
      totalStreams: myStreams.length,
      totalSales,
      totalCost,
      totalProfit,
      averageSales,
      bestPlatform
    };
  }, [myStreams]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="page-title">My Streams</h1>
        <div className="space-x-4">
          <Button onClick={() => onViewChange('streams')}>New Stream</Button>
          <Button onClick={() => onViewChange('dashboard')}>Back to Dashboard</Button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Streams</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light">{stats.totalStreams}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light">{formatCurrency(stats.totalSales)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Average Per Stream</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light">{formatCurrency(stats.averageSales)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Stream History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myStreams.map((stream) => (
                <TableRow key={stream.id}>
                  <TableCell>{stream.date}</TableCell>
                  <TableCell className="capitalize">{stream.platform}</TableCell>
                  <TableCell>
                    {formatTime(stream.startTime)} - {formatTime(stream.endTime)}
                  </TableCell>
                  <TableCell>{calculateStreamDuration(stream.startTime, stream.endTime)} hours</TableCell>
                  <TableCell>{formatCurrency(stream.totalSales || 0)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedStream(stream)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedStream && (
        <Dialog open={!!selectedStream} onOpenChange={() => setSelectedStream(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Stream Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{selectedStream.date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Platform</p>
                  <p className="font-medium capitalize">{selectedStream.platform}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {formatTime(selectedStream.startTime)} - {formatTime(selectedStream.endTime)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {calculateStreamDuration(selectedStream.startTime, selectedStream.endTime)} hours
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2">Items Sold:</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedStream.soldItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.quantitySold}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 text-right">
                <p className="text-lg font-semibold">
                  Total Sales: {formatCurrency(selectedStream.totalSales || 0)}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}