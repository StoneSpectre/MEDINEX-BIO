import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/integrations-supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, Activity, MessageSquare, TrendingUp, LogOut, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function AdminDashboard() {
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, isLoading, navigate]);

  const { data: signups, isLoading: signupsLoading } = useQuery({
    queryKey: ['early-access-signups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('early_access_signups')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: interactions, isLoading: interactionsLoading } = useQuery({
    queryKey: ['interaction-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interaction_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: feedback, isLoading: feedbackLoading } = useQuery({
    queryKey: ['feedback-responses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_responses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Aggregate data for charts
  const moduleUsage = interactions?.reduce((acc, event) => {
    const module = event.module || 'Unknown';
    acc[module] = (acc[module] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const moduleChartData = moduleUsage 
    ? Object.entries(moduleUsage).map(([name, value]) => ({ name, value }))
    : [];

  const eventTypeData = interactions?.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const eventChartData = eventTypeData
    ? Object.entries(eventTypeData).map(([name, count]) => ({ name, count }))
    : [];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Analytics and early access signups</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {signupsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{signups?.length || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {interactionsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{interactions?.length || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Feedback Count</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {feedbackLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{feedback?.length || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unique Sessions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {interactionsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">
                  {new Set(interactions?.map(i => i.session_id).filter(Boolean)).size}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="signups" className="space-y-4">
          <TabsList>
            <TabsTrigger value="signups">Early Access Signups</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="signups">
            <Card>
              <CardHeader>
                <CardTitle>Early Access Signups</CardTitle>
                <CardDescription>Users who signed up for early access</CardDescription>
              </CardHeader>
              <CardContent>
                {signupsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : signups?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No signups yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Institution</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {signups?.map((signup) => (
                        <TableRow key={signup.id}>
                          <TableCell className="font-medium">{signup.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{signup.role || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>{signup.institution || 'N/A'}</TableCell>
                          <TableCell>{format(new Date(signup.created_at), 'MMM d, yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Module Usage</CardTitle>
                  <CardDescription>Interactions per module</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {interactionsLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : moduleChartData.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No data yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={moduleChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {moduleChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Event Types</CardTitle>
                  <CardDescription>Distribution of interaction types</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {interactionsLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : eventChartData.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No data yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={eventChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Interactions</CardTitle>
                <CardDescription>Last 50 interaction events</CardDescription>
              </CardHeader>
              <CardContent>
                {interactionsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : interactions?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No interactions yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Session ID</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interactions?.slice(0, 50).map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <Badge variant="outline">{event.module || 'Unknown'}</Badge>
                          </TableCell>
                          <TableCell>{event.event_type}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {event.session_id?.slice(0, 8)}...
                          </TableCell>
                          <TableCell>{format(new Date(event.created_at), 'MMM d, HH:mm')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <Card>
              <CardHeader>
                <CardTitle>User Feedback</CardTitle>
                <CardDescription>Collected feedback from users</CardDescription>
              </CardHeader>
              <CardContent>
                {feedbackLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : feedback?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No feedback yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedback?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant="outline">{item.module}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.rating ? (
                              <span className="flex items-center">
                                {'★'.repeat(item.rating)}
                                {'☆'.repeat(5 - item.rating)}
                              </span>
                            ) : 'N/A'}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{item.comment || 'N/A'}</TableCell>
                          <TableCell>{item.email || 'Anonymous'}</TableCell>
                          <TableCell>{format(new Date(item.created_at), 'MMM d, yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
