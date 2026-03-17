const fs = require('fs');
const path = require('path');

const srcPath = 'C:/Users/Marwa/Desktop/tamam-dashboard/src';

const uiFixes = [
    { search: /bg-white\/[0-9]+/g, replace: 'bg-white' },
    { search: /dark:[a-z0-9\-\/]+/g, replace: '' },
    { search: /backdrop-blur-[a-z0-9]+/g, replace: '' },
    { search: /border-white\/[0-9]+/g, replace: 'border-slate-200' },
    { search: /shadow-black\/5/g, replace: 'shadow-sm' },
    { search: /shadow-inner/g, replace: '' },
    { search: /bg-gradient-to-[a-z]+ from-[a-z0-9\-]+ to-[a-z0-9\-]+/g, replace: 'bg-primary' },
    { search: /text-transparent /g, replace: '' },
    { search: /bg-clip-text /g, replace: '' },
    { search: /bg-primary text-primary/g, replace: 'text-primary' }, // fix accidental double
    { search: /bg-blue-600/g, replace: 'bg-primary' },
    { search: /hover:bg-blue-700/g, replace: 'hover:bg-primary/90' },
    { search: /text-blue-600/g, replace: 'text-primary' },
    { search: /text-blue-400/g, replace: 'text-primary' },
    { search: /text-blue-500\/10/g, replace: '' },
    { search: /border-blue-500\/20/g, replace: '' },
    { search: /shadow-xl shadow-sm/g, replace: 'shadow-sm' },
    { search: /shadow-2xl hover:-translate-y-1/g, replace: 'shadow-md hover:-translate-y-1' },
    { search: /  +/g, replace: ' ' } // normalize spaces
];

function clean(file) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    for (const rule of uiFixes) {
        content = content.replace(rule.search, rule.replace);
    }
    if (original !== content) {
        fs.writeFileSync(file, content, 'utf8');
    }
}

clean(srcPath + '/layouts/DashboardLayout.tsx');
clean(srcPath + '/pages/Overview.tsx');
clean(srcPath + '/pages/Store.tsx');
clean(srcPath + '/pages/Users.tsx');
clean(srcPath + '/pages/Requests.tsx');
clean(srcPath + '/components/ProductModal.tsx');
clean(srcPath + '/components/RequestDetailsModal.tsx');

// Fix Layout background
let layout = fs.readFileSync(srcPath + '/layouts/DashboardLayout.tsx', 'utf8');
layout = layout.replace('bg-transparent', 'bg-slate-50');
fs.writeFileSync(srcPath + '/layouts/DashboardLayout.tsx', layout, 'utf8');

// Fix global css
let css = fs.readFileSync(srcPath + '/index.css', 'utf8');
css = css.replace(/background-image:[\s\S]*?background-attachment:\s*fixed;/g, '');
fs.writeFileSync(srcPath + '/index.css', css, 'utf8');

console.log('UI Flat Reset Complete');
