import { useState, useMemo } from 'react';
import { ViewType, Stream, StreamItem, InventoryItem, StreamPlatform } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Eye, X, ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateId, formatCurrency, calculateStreamDuration, calculateTotal, formatTime, calculateTotalCost, calculateGrossProfit } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

type SortField = 'date' | 'streamer' | 'platform' | 'sales';
type SortOrder = 'asc' | 'desc';

interface StreamsProps {
  streams: Stream[];
  setStreams: (streams: Stream[]) => void;
  inventory: InventoryItem[];
  setInventory: (inventory: InventoryItem[]) => void;
  onViewChange: (view: ViewType) => void;
  inventoryChanges: any[];
  setInventoryChanges: (changes: any[]) => void;
}

export default function Streams({
  streams,
  setStreams,
  inventory,
  setInventory,
  onViewChange,
  inventoryChanges,
  setInventoryChanges,
}: StreamsProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('current');
  const [streamDetailsId, setStreamDetailsId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [streamerFilter, setStreamerFilter] = useState<string>('all');
  const [newStream, setNewStream] = useState<Omit<Stream, 'id' | 'soldItems'>>({
    date: '',
    startTime: '',
    endTime: '',
    streamer: user?.name || '',
    streamerId: user?.streamerId || '',
    sorter: '',
    platform: 'tiktok',
    totalSales: 0
  });
  const [selectedStreamItems, setSelectedStreamItems] = useState<StreamItem[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Get unique streamers for filter dropdown
  const uniqueStreamers = useMemo(() => {
    const streamers = new Set(streams.map(stream => stream.streamer || '').filter(Boolean));
    return Array.from(streamers);
  }, [streams]);

  // Filter and sort streams
  const sortedAndFilteredStreams = useMemo(() => {
    let filteredStreams = [...streams];

    // Filter by streamer if not showing all
    if (streamerFilter !== 'all') {
      filteredStreams = filteredStreams.filter(stream => stream.streamer === streamerFilter);
    }

    // Filter based on user role
    if (user?.role !== 'admin' && user?.role !== 'manager') {
      filteredStreams = filteredStreams.filter(stream => stream.streamerId === user?.streamerId);
    }

    return filteredStreams.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date || '').getTime() - new Date(b.date || '').getTime();
          break;
        case 'streamer':
          comparison = (a.streamer || '').localeCompare(b.streamer || '');
          break;
        case 'platform':
          comparison = (a.platform || '').localeCompare(b.platform || '');
          break;
        case 'sales':
          comparison = ((a.totalSales || 0) - (b.totalSales || 0));
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [streams, sortField, sortOrder, streamerFilter, user]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleAddStream = () => {
    if (!user) return;
    
    if (newStream.date && newStream.startTime && newStream.endTime && newStream.sorter) {
      const addedStream: Stream = {
        ...newStream,
        id: generateId('stream-'),
        soldItems: selectedStreamItems
      };
      setStreams([...streams, addedStream]);
      setNewStream({
        date: '',
        startTime: '',
        endTime: '',
        streamer: user?.name || '',
        streamerId: user?.streamerId || '',
        sorter: '',
        platform: 'tiktok',
        totalSales: 0
      });
      updateInventoryAfterStream(selectedStreamItems, false);
      setSelectedStreamItems([]);
    }
  };

  const updateInventoryAfterStream = (soldItems: StreamItem[], isRevert: boolean) => {
    if (!user) return;

    setInventory(prevInventory =>
      prevInventory.map(item => {
        const soldItem = soldItems.find(i => i.id === item.id);
        if (soldItem) {
          const quantityChange = isRevert ? soldItem.quantitySold : -soldItem.quantitySold;
          return { ...item, quantity: item.quantity + quantityChange };
        }
        return item;
      })
    );

    const change = {
      id: generateId('change-'),
      date: new Date().toISOString(),
      type: isRevert ? 'Stream Revert' : 'Stream Update',
      items: soldItems.map(item => ({
        name: item.name,
        quantityChange: isRevert ? item.quantitySold : -item.quantitySold
      })),
      user: user.name
    };
    setInventoryChanges([...inventoryChanges, change]);
  };

  const handleSelectStreamItem = (item: InventoryItem) => {
    const existingItem = selectedStreamItems.find(i => i.id === item.id);
    if (existingItem) {
      setSelectedStreamItems(prev =>
        prev.map(i => i.id === item.id ? { ...i, quantitySold: i.quantitySold + 1 } : i)
      );
    } else {
      setSelectedStreamItems(prev => [...prev, { ...item, quantitySold: 1 }]);
    }
  };

  const handleRemoveStreamItem = (id: string) => {
    setSelectedStreamItems(prev => prev.filter(item => item.id !== id));
  };

  const filteredInventoryForStream = useMemo(() => {
    return inventory.filter(item =>
      item.name.toLowerCase().includes(productSearchTerm.toLowerCase())
    );
  }, [inventory, productSearchTerm]);

  const renderStreamHistory = () => {
    const groupedByMonth = sortedAndFilteredStreams.reduce((acc, stream) => {
      const monthYear = new Date(stream.date).toLocaleString('en-US', { month: 'long', year: 'numeric' });
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(stream);
      return acc;
    }, {} as Record<string, Stream[]>);

    return (
      <div className="space-y-6">
        {/* Sorting and filtering controls */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4">
                <Select value={streamerFilter} onValueChange={setStreamerFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by streamer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Streamers</SelectItem>
                    {uniqueStreamers.map(streamer => (
                      <SelectItem key={streamer} value={streamer}>{streamer}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSort('date')}
                  className="flex items-center gap-2"
                >
                  Date
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSort('streamer')}
                  className="flex items-center gap-2"
                >
                  Streamer
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSort('platform')}
                  className="flex items-center gap-2"
                >
                  Platform
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSort('sales')}
                  className="flex items-center gap-2"
                >
                  Sales
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {Object.entries(groupedByMonth).map(([monthYear, monthStreams]) => {
          const totalSales = monthStreams.reduce((sum, stream) => sum + (stream.totalSales || 0), 0);
          const totalCost = monthStreams.reduce((sum, stream) => sum + calculateTotalCost(stream.soldItems), 0);
          const grossProfit = calculateGrossProfit(totalSales, totalCost);

          return (
            <Card key={monthYear} className="glass-card">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{monthYear}</CardTitle>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Sales</p>
                      <p className="text-lg font-semibold">{formatCurrency(totalSales)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Cost</p>
                      <p className="text-lg font-semibold">{formatCurrency(totalCost)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gross Profit</p>
                      <p className={`text-lg font-semibold ${grossProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(grossProfit)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Streamer</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthStreams.map((stream) => {
                      const streamCost = calculateTotalCost(stream.soldItems);
                      const streamProfit = calculateGrossProfit(stream.totalSales || 0, streamCost);

                      return (
                        <TableRow key={stream.id}>
                          <TableCell>{stream.date}</TableCell>
                          <TableCell>{stream.streamer}</TableCell>
                          <TableCell className="capitalize">{stream.platform}</TableCell>
                          <TableCell>
                            {formatTime(stream.startTime)} - {formatTime(stream.endTime)}
                          </TableCell>
                          <TableCell>{calculateStreamDuration(stream.startTime, stream.endTime)} hours</TableCell>
                          <TableCell>{formatCurrency(stream.totalSales || 0)}</TableCell>
                          <TableCell>{formatCurrency(streamCost)}</TableCell>
                          <TableCell className={streamProfit >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {formatCurrency(streamProfit)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setStreamDetailsId(stream.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="page-title">Stream Management</h1>
        <Button onClick={() => onViewChange('dashboard')}>Back to Dashboard</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="current">Current Stream</TabsTrigger>
          <TabsTrigger value="history">Stream History</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <Card className="form-card">
            <CardHeader>
              <CardTitle>Add New Stream</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="form-grid mb-6">
                <div className="input-group">
                  <Label htmlFor="stream-date">Date</Label>
                  <Input
                    id="stream-date"
                    type="date"
                    value={newStream.date}
                    onChange={(e) => setNewStream({ ...newStream, date: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <Label htmlFor="stream-start-time">Start Time</Label>
                  <Input
                    id="stream-start-time"
                    type="time"
                    value={newStream.startTime}
                    onChange={(e) => setNewStream({ ...newStream, startTime: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <Label htmlFor="stream-end-time">End Time</Label>
                  <Input
                    id="stream-end-time"
                    type="time"
                    value={newStream.endTime}
                    onChange={(e) => setNewStream({ ...newStream, endTime: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <Label htmlFor="stream-platform">Platform</Label>
                  <Select
                    value={newStream.platform}
                    onValueChange={(value: StreamPlatform) => 
                      setNewStream({ ...newStream, platform: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="fanatics">Fanatics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(user?.role === 'admin' || user?.role === 'manager') && (
                  <div className="input-group">
                    <Label htmlFor="stream-streamer">Streamer</Label>
                    <Input
                      id="stream-streamer"
                      value={newStream.streamer}
                      onChange={(e) => setNewStream({ ...newStream, streamer: e.target.value })}
                    />
                  </div>
                )}
                <div className="input-group">
                  <Label htmlFor="stream-sorter">Sorter</Label>
                  <Input
                    id="stream-sorter"
                    value={newStream.sorter}
                    onChange={(e) => setNewStream({ ...newStream, sorter: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <Label htmlFor="stream-sales">Total Sales</Label>
                  <Input
                    id="stream-sales"
                    type="number"
                    step="0.01"
                    value={newStream.totalSales}
                    onChange={(e) => setNewStream({ ...newStream, totalSales: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Select Inventory Items for Stream</Label>
                <div className="flex items-center space-x-2">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="flex-grow"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto rounded-md border border-border">
                  {filteredInventoryForStream.map((item) => (
                    <div
                      key={item.id}
                      className="stream-item"
                      onClick={() => handleSelectStreamItem(item)}
                    >
                      <span>{item.name} - {item.quantity} available</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectStreamItem(item);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Selected Items:</h4>
                  {selectedStreamItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center mt-1 bg-secondary/50 p-2 rounded">
                      <span>{item.name}</span>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={item.quantitySold}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value);
                            setSelectedStreamItems(prev =>
                              prev.map(i => i.id === item.id ? { ...i, quantitySold: newQuantity } : i)
                            );
                          }}
                          className="w-20"
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveStreamItem(item.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Button className="mt-6" onClick={handleAddStream}>
                Add Stream
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          {renderStreamHistory()}
        </TabsContent>
      </Tabs>

      {streamDetailsId && (
        <Dialog open={!!streamDetailsId} onOpenChange={() => setStreamDetailsId(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Stream Details</DialogTitle>
            </DialogHeader>
            {(() => {
              const stream = streams.find(s => s.id === streamDetailsId);
              if (!stream) return null;
              const streamCost = calculateTotalCost(stream.soldItems);
              const streamProfit = calculateGrossProfit(stream.totalSales || 0, streamCost);

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{stream.date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Platform</p>
                      <p className="font-medium capitalize">{stream.platform}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-medium">
                        {formatTime(stream.startTime)} - {formatTime(stream.endTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">{calculateStreamDuration(stream.startTime, stream.endTime)} hours</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Streamer</p>
                      <p className="font-medium">{stream.streamer}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sorter</p>
                      <p className="font-medium">{stream.sorter}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 bg-secondary/20 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Sales</p>
                      <p className="text-lg font-semibold">{formatCurrency(stream.totalSales || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Cost</p>
                      <p className="text-lg font-semibold">{formatCurrency(streamCost)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gross Profit</p>
                      <p className={`text-lg font-semibold ${streamProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(streamProfit)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-2">Sold Items:</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Quantity Sold</TableHead>
                          <TableHead>Cost per Item</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stream.soldItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.quantitySold}</TableCell>
                            <TableCell>{formatCurrency(item.cost)}</TableCell>
                            <TableCell>{formatCurrency(item.quantitySold * item.cost)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}