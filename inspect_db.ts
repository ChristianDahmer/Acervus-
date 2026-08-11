import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

async function inspect() {
  console.log('--- FIRESTORE DIAGNOSTICS START ---');
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.error('firebase-applet-config.json not found!');
      return;
    }
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('Firebase Project ID:', firebaseConfig.projectId);

    const app = initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    });

    const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);

    // Check system_configs/seeded
    try {
      const seededRef = doc(db, 'system_configs', 'seeded');
      const seededSnap = await getDoc(seededRef);
      if (seededSnap.exists()) {
        console.log('system_configs/seeded:', JSON.stringify(seededSnap.data()));
      } else {
        console.log('system_configs/seeded document does NOT exist!');
      }
    } catch (e: any) {
      console.error('Error reading system_configs/seeded:', e.message);
    }

    // Check system_configs/empresaConfig
    try {
      const empresaRef = doc(db, 'system_configs', 'empresaConfig');
      const empresaSnap = await getDoc(empresaRef);
      if (empresaSnap.exists()) {
        console.log('system_configs/empresaConfig:', JSON.stringify(empresaSnap.data()));
      } else {
        console.log('system_configs/empresaConfig does NOT exist!');
      }
    } catch (e: any) {
      console.error('Error reading system_configs/empresaConfig:', e.message);
    }

    const collections = [
      'itens',
      'clientes',
      'reservas',
      'categorias',
      'transacoes',
      'manutencoes',
      'modelosContratos',
      'webForms',
      'dispositivos_autorizados'
    ];

    for (const colName of collections) {
      try {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        console.log(`Collection "${colName}": ${snapshot.docs.length} documents`);
        if (snapshot.docs.length > 0) {
          const firstDocs = snapshot.docs.slice(0, 2).map(d => ({ id: d.id, data: d.data() }));
          console.log(`  -> Samples:`, JSON.stringify(firstDocs, null, 2));
        }
      } catch (e: any) {
        console.error(`Error reading collection "${colName}":`, e.message);
      }
    }

  } catch (error: any) {
    console.error('Diagnostics failed:', error.message || error);
  }
  console.log('--- FIRESTORE DIAGNOSTICS END ---');
}

inspect();
