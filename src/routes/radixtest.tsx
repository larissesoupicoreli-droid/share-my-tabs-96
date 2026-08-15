import { createFileRoute } from "@tanstack/react-router";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
export const Route = createFileRoute("/radixtest")({ component: () => (
  <div className="p-8 space-y-4">
    <Tabs defaultValue="a"><TabsList><TabsTrigger value="a">A</TabsTrigger></TabsList></Tabs>
    <Select><SelectTrigger><SelectValue placeholder="x" /></SelectTrigger><SelectContent><SelectItem value="1">um</SelectItem></SelectContent></Select>
    <Dialog><DialogTrigger>abrir</DialogTrigger><DialogContent><DialogTitle>oi</DialogTitle></DialogContent></Dialog>
  </div>
) });
