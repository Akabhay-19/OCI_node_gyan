
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log("Testing imports...");

try {
    const express = await import('express');
    console.log("express: OK");
} catch (e) { console.error("express: FAIL", e); }

try {
    const cors = await import('cors');
    console.log("cors: OK");
} catch (e) { console.error("cors: FAIL", e); }

try {
    const dotenv = await import('dotenv');
    console.log("dotenv: OK");
} catch (e) { console.error("dotenv: FAIL", e); }

try {
    const supabase = await import('@supabase/supabase-js');
    console.log("supabase: OK");
} catch (e) { console.error("supabase: FAIL", e); }

try {
    const multer = await import('multer');
    console.log("multer: OK");
} catch (e) { console.error("multer: FAIL", e); }

try {
    const pdfParse = require('pdf-parse');
    console.log("pdf-parse: OK");
} catch (e) { console.error("pdf-parse: FAIL", e); }

try {
    const mammoth = require('mammoth');
    console.log("mammoth: OK");
} catch (e) { console.error("mammoth: FAIL", e); }

try {
    const aiService = await import('./ai-service.js');
    console.log("ai-service.js: OK");
} catch (e) { console.error("ai-service.js: FAIL", e); }

console.log("Done.");
