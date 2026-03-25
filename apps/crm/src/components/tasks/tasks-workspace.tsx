"use client";

import { useEffect, useMemo, useState } from "react";
import type { Task } from "@/lib/tasks-store";
import TasksTable from "@/components/tasks/tasks-table";
import TaskEditSlideOver from "@/components/tasks/task-edit-slide-over";

type LeadOption = {
  id: string;
  name: string;
};

type ProfileOption = {
  id: string;
  fullName: string;
};

export default function TasksWorkspace({
  tasks,
  leads,
  profiles,
}: {
  tasks: Task[];
  leads: LeadOption[];
  profiles: ProfileOption[];
}) {
  const [items, setItems] = useState(tasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDone = a.status === "done" ? 1 : 0;
      const bDone = b.status === "done" ? 1 : 0;

      if (aDone !== bDone) return aDone - bDone;

      const priorityOrder: Record<string, number> = {
        high: 0,
        medium: 1,
        low: 2,
      };

      return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
    });
  }, [items]);

  function openEdit(task: Task) {
    setSelectedTask(task);
    setIsOpen(true);
  }

  return (
    <>
      <TasksTable tasks={sorted} leads={leads} profiles={profiles} onEdit={openEdit} />

      <TaskEditSlideOver
        task={selectedTask}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSaved={(updatedTask) => {
          setItems((current) =>
            current.map((item) => (item.id === updatedTask.id ? updatedTask : item))
          );
          setSelectedTask(updatedTask);
        }}
        leads={leads}
        profiles={profiles}
      />
    </>
  );
}
