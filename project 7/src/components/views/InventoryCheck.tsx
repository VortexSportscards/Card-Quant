import { useState } from 'react';
import { ViewType } from '@/lib/types';
import { InventoryItem, InventoryCheck as IInventoryCheck, InventoryChange } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, ChevronDown, Eye } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency, formatTime, createInventoryChange } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface InventoryCheckProps {
  currentView: ViewType;
  inventory: InventoryItem[];
  setInventory: (inventory: InventoryItem[]) => void;
  inventoryChecks: IInventoryCheck[];
  setInventoryChecks: (checks: IInventoryCheck[]) => void;
  currentCheck: IInventoryCheck | null;
  setCurrentCheck: (check: IInventoryCheck | null) => void;
  onViewChange: (view: ViewType) => void;
  inventoryChanges: InventoryChange[];
  setInventoryChanges: (changes: InventoryChange[]) => void;
}

interface CheckItem {
  id: string;
  name: string;
  expectedQuantity: number;
  actualQuantity: number;
  isChecked: boolean;
  isCorrect?: boolean;
}

export default function InventoryCheck({
  currentView,
  inventory,
  setInventory,
  inventoryChecks,
  setInventoryChecks,
  currentCheck,
  setCurrentCheck,
  onViewChange,
  inventoryChanges,
  setInventoryChanges,
}: InventoryCheckProps) {
  const { user } = useAuth();
  const [checkItems, setCheckItems] = useState<CheckItem[]>(
    inventory.map(item => ({
      id: item.id,
      name: item.name,
      expectedQuantity: item.quantity,
      actualQuantity: item.quantity,
      isChecked: false,
    }))
  );
  const [showPreviousChecks, setShowPreviousChecks] = useState(false);
  const [selectedPreviousCheck, setSelectedPreviousCheck] = useState<IInventoryCheck | null>(null);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [checkToUpdate, setCheckToUpdate] = useState<IInventoryCheck | null>(null);
  const [showDiscrepancies, setShowDiscrepancies] = useState(false);

  const handleQuantityUpdate = (id: string, quantity: number) => {
    setCheckItems(items =>
      items.map(item =>
        item.id === id
          ? { 
              ...item, 
              actualQuantity: quantity,
              isChecked: true, 
              isCorrect: quantity === item.expectedQuantity 
            }
          : item
      )
    );
  };

  const handleCorrectQuantity = (id: string) => {
    setCheckItems(items =>
      items.map(item =>
        item.id === id
          ? { 
              ...item, 
              isChecked: true, 
              isCorrect: true, 
              actualQuantity: item.expectedQuantity 
            }
          : item
      )
    );
  };

  const handleFinishCheck = () => {
    const uncheckedItems = checkItems.filter(item => !item.isChecked);
    if (uncheckedItems.length > 0) {
      alert('Please check all items before finishing');
      return;
    }

    const discrepancies = checkItems.filter(item => !item.isCorrect);
    const missingItems = discrepancies.length;

    const finalCheck: IInventoryCheck = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      checkedItems: checkItems.map(({ id, name, expectedQuantity, actualQuantity }) => ({
        id,
        name,
        expectedQuantity,
        actualQuantity
      })),
      isCorrect: missingItems === 0,
      missingItems,
    };

    setInventoryChecks([...inventoryChecks, finalCheck]);
    setCheckToUpdate(finalCheck);
    
    if (missingItems > 0) {
      setShowDiscrepancies(true);
    } else {
      onViewChange('dashboard');
    }
  };

  const handleUpdateInventory = (shouldUpdate: boolean) => {
    if (shouldUpdate && checkToUpdate && user) {
      const updatedInventory = inventory.map(item => {
        const checkedItem = checkToUpdate.checkedItems.find(ci => ci.id === item.id);
        if (checkedItem) {
          return { ...item, quantity: checkedItem.actualQuantity };
        }
        return item;
      });

      const change = createInventoryChange(
        'check',
        user,
        inventory,
        updatedInventory,
        `Inventory check by ${user.name}`
      );

      setInventory(updatedInventory);
      setInventoryChanges([change, ...inventoryChanges]);
    }

    setShowUpdateConfirmation(false);
    setShowDiscrepancies(false);
    setCheckToUpdate(null);
    onViewChange('dashboard');
  };

  const renderDiscrepanciesDialog = () => {
    if (!checkToUpdate) return null;

    const discrepancies = checkToUpdate.checkedItems.filter(
      item => item.expectedQuantity !== item.actualQuantity
    );

    return (
      <Dialog open={showDiscrepancies} onOpenChange={setShowDiscrepancies}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Discrepancies Found</DialogTitle>
            <DialogDescription>
              Found {discrepancies.length} items with incorrect quantities
            </DialogDescription>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discrepancies.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.expectedQuantity}</TableCell>
                  <TableCell>{item.actualQuantity}</TableCell>
                  <TableCell className={item.actualQuantity < item.expectedQuantity ? 'text-red-500' : 'text-green-500'}>
                    {item.actualQuantity - item.expectedQuantity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleUpdateInventory(false)}>
              Keep Original Quantities
            </Button>
            <Button onClick={() => handleUpdateInventory(true)}>
              Update Inventory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderPreviousCheckDetails = () => {
    if (!selectedPreviousCheck) return null;

    const discrepancies = selectedPreviousCheck.checkedItems.filter(
      item => item.expectedQuantity !== item.actualQuantity
    );

    return (
      <Dialog open={!!selectedPreviousCheck} onOpenChange={() => setSelectedPreviousCheck(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedPreviousCheck.isCorrect ? 'Inventory Check Details' : 'Discrepancies Found'}
            </DialogTitle>
            <DialogDescription>
              Check completed on {selectedPreviousCheck.date} at {formatTime(selectedPreviousCheck.time)}
            </DialogDescription>
          </DialogHeader>

          {selectedPreviousCheck.isCorrect ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                All quantities were correct during this check.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Attention Required</AlertTitle>
                <AlertDescription>
                  Found {selectedPreviousCheck.missingItems} discrepancies
                </AlertDescription>
              </Alert>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discrepancies.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.expectedQuantity}</TableCell>
                      <TableCell>{item.actualQuantity}</TableCell>
                      <TableCell className={item.expectedQuantity > item.actualQuantity ? 'text-red-500' : 'text-green-500'}>
                        {item.actualQuantity - item.expectedQuantity}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPreviousCheck(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold">Inventory Check</h1>
        <div className="space-x-4">
          <Button onClick={() => onViewChange('dashboard')}>Back to Dashboard</Button>
          <Button onClick={handleFinishCheck}>Finish Check</Button>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Check Inventory Quantities</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Expected Quantity</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>New Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkItems.map((item) => (
                <TableRow 
                  key={item.id}
                  className={
                    item.isChecked
                      ? item.isCorrect
                        ? 'bg-green-500/10'
                        : 'bg-red-500/10'
                      : ''
                  }
                >
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.expectedQuantity}</TableCell>
                  <TableCell>
                    {formatCurrency(
                      item.expectedQuantity * 
                      (inventory.find(i => i.id === item.id)?.cost || 0)
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-20"
                        onClick={() => handleCorrectQuantity(item.id)}
                        disabled={item.isChecked && item.isCorrect}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Yes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-20"
                        onClick={() => {
                          const input = document.getElementById(`quantity-${item.id}`) as HTMLInputElement;
                          input?.focus();
                        }}
                        disabled={item.isChecked && item.isCorrect}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        No
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      id={`quantity-${item.id}`}
                      type="number"
                      className="w-24"
                      value={item.actualQuantity}
                      onChange={(e) => handleQuantityUpdate(item.id, parseInt(e.target.value) || 0)}
                      disabled={item.isChecked && item.isCorrect}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Collapsible
        open={showPreviousChecks}
        onOpenChange={setShowPreviousChecks}
        className="w-full"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center justify-between w-full"
          >
            <span>View Previous Checks</span>
            <ChevronDown className={`h-4 w-4 transform transition-transform ${showPreviousChecks ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Previous Inventory Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Discrepancies</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryChecks.map((check) => (
                    <TableRow key={check.id}>
                      <TableCell>{check.date}</TableCell>
                      <TableCell>{formatTime(check.time)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 ${check.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                          {check.isCorrect ? (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Correct
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4" />
                              Discrepancies Found
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>{check.missingItems}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPreviousCheck(check)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {renderDiscrepanciesDialog()}
      {renderPreviousCheckDetails()}
    </div>
  );
}