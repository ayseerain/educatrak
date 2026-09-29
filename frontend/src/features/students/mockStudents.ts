import { centavos } from "@/lib/money";

export const students = [
  { id: "sample-1001", number: "S-1001", name: "Amara Villanueva (sample)", grade: "Grade 7", section: "Olive", studentStatus: "Active", billingStatus: "Current", clearanceStatus: "Not cleared", balance: centavos(125000) },
  { id: "sample-1002", number: "S-1002", name: "Basil Mercado (sample)", grade: "Grade 8", section: "Maple", studentStatus: "Active", billingStatus: "Due soon", clearanceStatus: "Not cleared", balance: centavos(420000) },
  { id: "sample-1003", number: "S-1003", name: "Cora Navarro (sample)", grade: "Grade 9", section: "Pine", studentStatus: "Active", billingStatus: "Overdue", clearanceStatus: "Not cleared", balance: centavos(850000) },
];

export type Student = (typeof students)[number];
