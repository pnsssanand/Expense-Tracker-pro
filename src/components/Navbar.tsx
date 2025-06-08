import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Home, PieChart, CreditCard, LogOut, Menu, X, 
  User, Settings, ChevronDown, LayoutDashboard 
} from 'lucide-react';
import { db, auth } from '@/lib/firebase';

// Helper function to get user initials
const getInitials = (name: string) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

export const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  
  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" aria-hidden="true" /> },
    { path: '/transactions', label: 'Transactions', icon: <CreditCard className="h-5 w-5" aria-hidden="true" /> },
    { path: '/analytics', label: 'Analytics', icon: <PieChart className="h-5 w-5" aria-hidden="true" /> },
  ];

  const activeItem = navItems.find(item => item.path === location.pathname) || navItems[0];

  return (
    <>
      {/* Desktop navigation */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center">
                <img className="h-8 w-auto" src="/logo.svg" alt="Expense Tracker" />
                <span className="ml-2 text-lg font-semibold text-gray-900">Expense Tracker</span>
              </Link>
              
              <nav className="ml-8 flex space-x-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                      location.pathname === item.path
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className="flex items-center">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 rounded-md">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-600">
                          {getInitials(user.displayName || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left hidden sm:block">
                        <p className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                          {user.displayName || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[120px]">
                          {user.email || ''}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                        <p className="text-xs leading-none text-gray-500">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="cursor-pointer flex items-center"
                      onClick={() => window.location.href = "/profile"}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer flex items-center"
                      onClick={() => window.location.href = "/settings"}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="cursor-pointer flex items-center text-red-600"
                      onClick={logout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex space-x-2">
                  <Link to="/login">
                    <Button variant="outline" size="sm">Log in</Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="sm">Sign up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation - Top bar */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 md:hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mr-2 rounded-md p-1.5"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
              <span className="sr-only">Open main menu</span>
            </Button>
            
            <Link to="/" className="flex items-center">
              <img className="h-8 w-auto" src="/logo.svg" alt="Expense Tracker" />
            </Link>
          </div>
          
          {user && (
            <Avatar className="h-8 w-8" onClick={() => setMobileMenuOpen(true)}>
              <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
              <AvatarFallback className="bg-indigo-100 text-indigo-600">
                {getInitials(user.displayName || '')}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div 
              className="fixed top-0 left-0 bottom-0 w-[75%] max-w-sm bg-white p-4 shadow-lg flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* User info */}
              {user && (
                <div className="pb-4 mb-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-600">
                        {getInitials(user.displayName || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-3">
                      <p className="text-base font-medium text-gray-800">{user.displayName || 'User'}</p>
                      <p className="text-sm text-gray-500 truncate max-w-[200px]">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Navigation items */}
              <nav className="flex-1 space-y-1 pb-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-4 py-3 text-base font-medium rounded-md ${
                      location.pathname === item.path
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* User actions */}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                {user ? (
                  <>
                    <Link 
                      to="/profile" 
                      className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="mr-3 h-5 w-5 text-gray-500" />
                      Profile
                    </Link>
                    <Link 
                      to="/settings" 
                      className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Settings className="mr-3 h-5 w-5 text-gray-500" />
                      Settings
                    </Link>
                    <button 
                      className="flex w-full items-center px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md"
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="mr-3 h-5 w-5" />
                      Logout
                    </button>
                  </>
                ) : (
                  <div className="px-4 flex flex-col space-y-2">
                    <Link 
                      to="/login" 
                      className="w-full px-4 py-2 text-center text-base font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Log in
                    </Link>
                    <Link 
                      to="/signup" 
                      className="w-full px-4 py-2 text-center text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 md:hidden">
        <div className="grid grid-cols-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center h-16 ${
                location.pathname === item.path 
                  ? 'text-indigo-600' 
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Extra bottom padding to prevent content from being hidden by the mobile navigation bar */}
      <div className="h-16 md:h-0 block md:hidden"></div>
    </>
  );
};
