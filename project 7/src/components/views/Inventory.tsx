import { useState, useMemo } from 'react';
import { ViewType, InventoryItem, InventoryChange } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUpload } from '@/components/FileUpload';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Search, Plus, X, Trash2, History } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { generateId, formatCurrency, createInventoryChange } from '@/lib/utils';
import InventoryChanges from '@/components/inventory/InventoryChanges';
import { useAuth } from '@/contexts/AuthContext';

interface InventoryViewProps {
  inventory: InventoryItem[];
  editedInventory: InventoryItem[];
  setInventory: (inventory: InventoryItem[]) => void;
  setEditedInventory: (inventory: InventoryItem[]) => void;
  categories: string[];
  setCategories: (categories: string[]) => void;
  onViewChange: (view: ViewType) => void;
  inventoryChanges: InventoryChange[];
  setInventoryChanges: (changes: InventoryChange[]) => void;
}

export default function Inventory({
  inventory,
  editedInventory,
  setInventory,
  setEditedInventory,
  categories,
  setCategories,
  onViewChange,
  inventoryChanges,
  setInventoryChanges,
}: InventoryViewProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<InventoryItem>({
    id: '',
    name: '',
    quantity: 0,
    cost: 0,
    category: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [newCategory, setNewCategory] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleUploadSuccess = (newItems: InventoryItem[]) => {
    if (!user) return;

    const itemsWithCategories = newItems.map(item => ({
      ...item,
      id: generateId('inv-'),
      category: item.category || 'Uncategorized'
    }));

    const updatedInventory = [...inventory, ...itemsWithCategories];
    
    const change = createInventoryChange(
      'upload',
      user,
      inventory,
      updatedInventory,
      `Bulk upload of ${newItems.length} items by ${user.name}`
    );

    setInventory(updatedInventory);
    setInventoryChanges([change, ...inventoryChanges]);
    setShowUploadForm(false);
    setUploadError('');
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
  };

  const handleAddItem = () => {
    if (!user) return;
    if (newItem.name && newItem.quantity >= 0 && newItem.cost > 0) {
      const addedItem = {
        ...newItem,
        id: generateId('inv-'),
        category: newItem.category || 'Uncategorized'
      };

      const updatedInventory = [...inventory, addedItem];
      
      const change = createInventoryChange(
        'manual',
        user,
        inventory,
        updatedInventory,
        `Added new item: ${addedItem.name}`
      );

      setInventory(updatedInventory);
      setInventoryChanges([change, ...inventoryChanges]);
      setNewItem({ id: '', name: '', quantity: 0, cost: 0, category: '' });
      setShowAddForm(false);
    }
  };

  const handleEditAll = () => {
    if (!user) return;
    
    if (editMode) {
      const change = createInventoryChange(
        'manual',
        user,
        inventory,
        editedInventory,
        `Bulk edit by ${user.name}`
      );

      setInventory(editedInventory);
      setInventoryChanges([change, ...inventoryChanges]);
    }
    
    setEditMode(!editMode);
  };

  const handleEditItem = (id: string, field: keyof InventoryItem, value: string | number) => {
    setEditedInventory(prevInventory =>
      prevInventory.map(item => {
        if (item.id !== id) return item;
        
        let updatedValue = value;
        if (field === 'quantity') {
          const parsedValue = parseInt(value.toString());
          updatedValue = isNaN(parsedValue) ? 0 : parsedValue;
        } else if (field === 'cost') {
          const parsedValue = parseFloat(value.toString());
          updatedValue = isNaN(parsedValue) ? 0 : parsedValue;
        }
        
        return { ...item, [field]: updatedValue };
      })
    );
  };

  const handleAddCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setNewCategory('');
    }
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    if (!user) return;

    const updatedInventory = inventory.map(item =>
      item.category === categoryToDelete ? { ...item, category: 'Uncategorized' } : item
    );

    const change = createInventoryChange(
      'manual',
      user,
      inventory,
      updatedInventory,
      `Category "${categoryToDelete}" deleted and items moved to Uncategorized`
    );

    setCategories(categories.filter(category => category !== categoryToDelete));
    setInventory(updatedInventory);
    setInventoryChanges([change, ...inventoryChanges]);
    
    if (categoryFilter === categoryToDelete) {
      setCategoryFilter('all');
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleBulkCategoryAssign = () => {
    if (!user || !bulkCategory) return;

    const updatedInventory = inventory.map(item =>
      selectedItems.includes(item.id) ? { ...item, category: bulkCategory } : item
    );

    const change = createInventoryChange(
      'manual',
      user,
      inventory,
      updatedInventory,
      `Bulk category update to "${bulkCategory}" for ${selectedItems.length} items`
    );

    setInventory(updatedInventory);
    setInventoryChanges([change, ...inventoryChanges]);
    setSelectedItems([]);
    setBulkCategory('');
  };

  const handleDeleteItem = (id: string) => {
    if (!user) return;

    const itemToDelete = inventory.find(item => item.id === id);
    if (!itemToDelete) return;

    const updatedInventory = inventory.filter(item => item.id !== id);
    
    const change = createInventoryChange(
      'manual',
      user,
      inventory,
      updatedInventory,
      `Deleted item: ${itemToDelete.name}`
    );

    setInventory(updatedInventory);
    setInventoryChanges([change, ...inventoryChanges]);
    setItemToDelete(null);
  };

  // Rest of the component remains the same...
  // (The rendering logic is unchanged, so I'm not repeating it here)
  const calculateTotalInventoryValue = () => {
    const total = editedInventory.reduce((sum, item) => sum + item.quantity * item.cost, 0);
    return formatCurrency(total);
  };

  const filteredAndSortedInventory = useMemo(() => {
    return editedInventory
      .filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (categoryFilter === 'all' || item.category === categoryFilter)
      )
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [editedInventory, searchTerm, categoryFilter]);

  const groupedInventory = useMemo(() => {
    const grouped = filteredAndSortedInventory.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, InventoryItem[]>);

    return Object.entries(grouped).map(([category, items]) => ({
      category,
      items,
      totalValue: items.reduce((sum, item) => sum + item.quantity * item.cost, 0),
    }));
  }, [filteredAndSortedInventory]);

  const renderInventoryContent = () => (
    <>
      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button
          variant="secondary"
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          {showUploadForm ? 'Hide Upload' : 'Upload Inventory'}
        </Button>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Hide Add Form' : 'Add New Item'}
        </Button>
        <Button onClick={handleEditAll}>
          {editMode ? 'Save All Changes' : 'Edit All'}
        </Button>
        <Button
          variant="secondary"
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          onClick={() => setShowCategoryManagement(!showCategoryManagement)}
        >
          Categories {selectedItems.length > 0 && `(${selectedItems.length})`}
        </Button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <Card className="form-card">
          <CardHeader>
            <CardTitle>Upload Inventory Sheet</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </CardContent>
        </Card>
      )}

      {/* Upload Error */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* Add Item Form */}
      {showAddForm && (
        <Card className="form-card">
          <CardHeader>
            <CardTitle>Add New Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="form-grid">
              <div className="input-group">
                <Label htmlFor="item-name">Name</Label>
                <Input
                  id="item-name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>
              <div className="input-group">
                <Label htmlFor="item-quantity">Quantity</Label>
                <Input
                  id="item-quantity"
                  type="number"
                  value={newItem.quantity.toString()}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setNewItem({ ...newItem, quantity: isNaN(value) ? 0 : value });
                  }}
                />
              </div>
              <div className="input-group">
                <Label htmlFor="item-cost">Cost</Label>
                <Input
                  id="item-cost"
                  type="number"
                  step="0.01"
                  value={newItem.cost.toString()}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setNewItem({ ...newItem, cost: isNaN(value) ? 0 : value });
                  }}
                />
              </div>
              <div className="input-group">
                <Label htmlFor="item-category">Category</Label>
                <Select onValueChange={(value) => setNewItem({ ...newItem, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="mt-4" onClick={handleAddItem}>Add Item</Button>
          </CardContent>
        </Card>
      )}

      {/* Category Management */}
      {showCategoryManagement && (
        <Card className="form-card">
          <CardHeader>
            <CardTitle>Manage Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2 mb-4">
              <Input
                placeholder="New category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <Button onClick={handleAddCategory}>
                <Plus className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <div
                  key={category}
                  className="flex items-center bg-secondary text-secondary-foreground rounded-full px-3 py-1"
                >
                  {category}
                  {category !== 'Other' && category !== 'Uncategorized' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-4 w-4 p-0"
                      onClick={() => handleDeleteCategory(category)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Assign Category to Selected Items</h4>
              <div className="flex items-center space-x-2">
                <Select value={bulkCategory} onValueChange={setBulkCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleBulkCategoryAssign}
                  disabled={!bulkCategory || selectedItems.length === 0}
                >
                  Assign to Selected
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Table */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-4">
            <CardTitle>Current Inventory</CardTitle>
            <div className="text-2xl font-bold">
              Total Value: {calculateTotalInventoryValue()}
            </div>
          </div>
          <Collapsible open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="icon" className="w-10 p-0">
                <Search className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="absolute right-0 mt-2 w-[300px]">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-end space-x-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {groupedInventory.map(({ category, items, totalValue }) => (
            <div key={category} className="mb-8">
              <h3 className="text-xl font-semibold mb-2">{category}</h3>
              <div className="data-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Select</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Total Value</TableHead>
                      {editMode && <TableHead className="w-[100px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => handleSelectItem(item.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {editMode ? (
                            <Input
                              value={item.name}
                              onChange={(e) => handleEditItem(item.id, 'name', e.target.value)}
                            />
                          ) : (
                            item.name
                          )}
                        </TableCell>
                        <TableCell>
                          {editMode ? (
                            <Input
                              type="number"
                              value={item.quantity.toString()}
                              onChange={(e) => handleEditItem(item.id, 'quantity', e.target.value)}
                            />
                          ) : (
                            item.quantity
                          )}
                        </TableCell>
                        <TableCell>
                          {editMode ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={item.cost.toString()}
                              onChange={(e) => handleEditItem(item.id, 'cost', e.target.value)}
                            />
                          ) : (
                            formatCurrency(item.cost)
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(item.quantity * item.cost)}</TableCell>
                        {editMode && (
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setItemToDelete(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Confirm Deletion</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to delete this item? This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setItemToDelete(null)}>
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleDeleteItem(item.id)}
                                  >
                                    Delete
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-2 text-right font-semibold">
                Total: {formatCurrency(totalValue)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="page-title">Inventory Management</h1>
        <Button onClick={() => onViewChange('dashboard')}>Back to Dashboard</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory">Current Inventory</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          {renderInventoryContent()}
        </TabsContent>

        <TabsContent value="history">
          <InventoryChanges inventoryChanges={inventoryChanges} />
        </TabsContent>
      </Tabs>
    </div>
  );
}