import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import Login from '@/components/Login';
import Dashboard from '@/components/views/Dashboard';
import Inventory from '@/components/views/Inventory';
import Streams from '@/components/views/Streams';
import InventoryCheck from '@/components/views/InventoryCheck';
import UserManagement from '@/components/UserManagement';
import { initialInventory, initialStreams, initialCategories } from '@/data/initialData';
import { InventoryItem, Stream, InventoryCheck as IInventoryCheck, ViewType, InventoryChange } from '@/lib/types';
import { hasPermission } from '@/lib/auth';
import { storage } from '@/lib/storage';

export default function App() {
  const { user, isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [inventory, setInventory] = useState<InventoryItem[]>(() => 
    storage.loadInventory(initialInventory)
  );
  const [editedInventory, setEditedInventory] = useState<InventoryItem[]>(inventory);
  const [streams, setStreams] = useState<Stream[]>(() => 
    storage.loadStreams(initialStreams)
  );
  const [categories, setCategories] = useState<string[]>(() => 
    storage.loadCategories(initialCategories)
  );
  const [inventoryChecks, setInventoryChecks] = useState<IInventoryCheck[]>(() => 
    storage.loadInventoryChecks([])
  );
  const [currentCheck, setCurrentCheck] = useState<IInventoryCheck | null>(null);
  const [inventoryChanges, setInventoryChanges] = useState<InventoryChange[]>(() => 
    storage.loadInventoryChanges([])
  );

  // Save data whenever it changes
  useEffect(() => {
    storage.saveInventory(inventory);
  }, [inventory]);

  useEffect(() => {
    storage.saveStreams(streams);
  }, [streams]);

  useEffect(() => {
    storage.saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    storage.saveInventoryChecks(inventoryChecks);
  }, [inventoryChecks]);

  useEffect(() => {
    storage.saveInventoryChanges(inventoryChanges);
  }, [inventoryChanges]);

  useEffect(() => {
    setEditedInventory(inventory);
  }, [inventory]);

  if (!isAuthenticated) {
    return <Login />;
  }

  const calculateTotalValue = () => {
    if (!hasPermission(user, 'view_costs')) return 'Hidden';
    const total = editedInventory.reduce((sum, item) => sum + item.quantity * item.cost, 0);
    return total.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  const startInventoryCheck = () => {
    const newCheck: IInventoryCheck = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      checkedItems: inventory.map(item => ({
        id: item.id,
        name: item.name,
        expectedQuantity: item.quantity,
        actualQuantity: item.quantity,
      })),
      isCorrect: true,
      missingItems: 0,
    };
    setCurrentCheck(newCheck);
    setCurrentView('inventoryCheck');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            totalValue={calculateTotalValue()}
            totalStreams={streams.length}
            onViewChange={setCurrentView}
            onStartInventoryCheck={startInventoryCheck}
          />
        );
      case 'inventory':
        return (
          <Inventory
            inventory={inventory}
            editedInventory={editedInventory}
            setInventory={setInventory}
            setEditedInventory={setEditedInventory}
            categories={categories}
            setCategories={setCategories}
            onViewChange={setCurrentView}
            inventoryChanges={inventoryChanges}
            setInventoryChanges={setInventoryChanges}
          />
        );
      case 'streams':
        return (
          <Streams
            streams={streams}
            setStreams={setStreams}
            inventory={inventory}
            setInventory={setInventory}
            onViewChange={setCurrentView}
            inventoryChanges={inventoryChanges}
            setInventoryChanges={setInventoryChanges}
          />
        );
      case 'inventoryCheck':
      case 'inventoryCheckQuantity':
      case 'inventoryCheckResult':
      case 'pastChecks':
      case 'checkDetails':
        return (
          <InventoryCheck
            currentView={currentView}
            inventory={inventory}
            setInventory={setInventory}
            inventoryChecks={inventoryChecks}
            setInventoryChecks={setInventoryChecks}
            currentCheck={currentCheck}
            setCurrentCheck={setCurrentCheck}
            onViewChange={setCurrentView}
            inventoryChanges={inventoryChanges}
            setInventoryChanges={setInventoryChanges}
          />
        );
      case 'users':
        if (hasPermission(user, 'manage_users')) {
          return (
            <UserManagement
              users={storage.loadUsers([])}
              onUpdateUsers={(users) => storage.saveUsers(users)}
            />
          );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      {renderView()}
    </Layout>
  );
}