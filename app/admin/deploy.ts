'use server'

import { exec } from 'child_process';
import { promisify } from 'util';
import { revalidatePath } from 'next/cache';

const execAsync = promisify(exec);

type DeployResult = {
  success: boolean;
  message: string;
  url?: string;
  logs?: string[];
};

export async function deployToVercel(): Promise<DeployResult> {
  // Security Check: Only allow this in development (localhost)
  // This prevents the deployed version from trying to deploy itself recursively
  if (process.env.NODE_ENV !== 'development') {
    return {
      success: false,
      message: 'Esta función solo está disponible en el entorno local de desarrollo.'
    };
  }

  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[Deploy] ${msg}`);
    logs.push(msg);
  };

  try {
    log('Iniciando proceso de despliegue optimizado...');

    // 1. Git Sync
    log('1/4 Sincronizando con Git...');
    try {
        await execAsync('git add .');
        await execAsync('git commit -m "Auto deploy from Admin Dashboard"');
    } catch (e: any) {
        // Ignore empty commit error if nothing changed
        if (!e.message.includes('nothing to commit')) {
            log(`Git warning: ${e.message}`);
        }
    }

    // 2. Local Build (Saves Vercel Credits)
    log('2/4 Construyendo proyecto localmente (Vercel Build)...');
    // We use 'npx vercel build --prod' to generate the .vercel/output folder
    await execAsync('npx vercel build --prod');

    // 3. Deploy Prebuilt (Fast & Free-ish)
    log('3/4 Subiendo archivos a Vercel...');
    const { stdout: deployUrl } = await execAsync('npx vercel deploy --prebuilt --prod');

    // 4. Verification
    const url = deployUrl.trim();
    log(`4/4 ¡Despliegue completado! URL: ${url}`);

    revalidatePath('/');
    
    return {
      success: true,
      message: 'Despliegue exitoso',
      url: url,
      logs
    };

  } catch (error: any) {
    console.error('Deploy Error:', error);
    return {
      success: false,
      message: error.message || 'Error desconocido durante el despliegue',
      logs
    };
  }
}
