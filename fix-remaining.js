const fs = require('fs');

let p2 = 'src/app/(dashboard)/entregas/page.tsx';
let c2 = fs.readFileSync(p2, 'utf8');
c2 = c2.replace(/\(s: number, p\)/g, '(s: number, p: any)');
fs.writeFileSync(p2, c2);

let p3 = 'src/app/(dashboard)/avarias/page.tsx';
let c3 = fs.readFileSync(p3, 'utf8');
c3 = c3.replace('[...new Set(filtradas.map(a => a.entrega.motorista?.nome).filter(Boolean))]', 'Array.from(new Set(filtradas.map(a => a.entrega.motorista?.nome).filter(Boolean)))');
fs.writeFileSync(p3, c3);
