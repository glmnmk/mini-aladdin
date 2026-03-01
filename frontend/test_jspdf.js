import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
console.log("jsPDF typeof:", typeof jsPDF);
try {
  const doc = new jsPDF();
  console.log("doc object:", typeof doc);
  console.log("has autoTable:", typeof doc.autoTable !== 'undefined');
} catch (e) {
  console.log("ERROR:", e);
}
