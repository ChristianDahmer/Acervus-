/**
 * Global Utility for clean, high-fidelity printing across AI Studio preview iframe,
 * mobile views, and standalone web applications.
 */

export interface PrintOptions {
  title?: string;
  subtitle?: string;
  styles?: string;
}

/**
 * Collects all active <style> and <link rel="stylesheet"> content from current document
 * to pass along to print context so Tailwind and custom styles render perfectly.
 */
function getDocumentStylesheetsHTML(): string {
  let styleTags = '';
  try {
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    styles.forEach((style) => {
      styleTags += style.outerHTML;
    });
  } catch (err) {
    console.warn('Could not read document stylesheets for print:', err);
  }
  return styleTags;
}

export function printHtmlContent(htmlContent: string, options: PrintOptions = {}) {
  const docTitle = options.title || 'Documento — Acervus Locadora';
  const docSubtitle = options.subtitle || '';
  const stylesheets = getDocumentStylesheetsHTML();

  const printDocumentHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${docTitle}</title>
        ${stylesheets}
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          *, *:before, *:after {
            box-sizing: border-box !important;
          }
          html, body {
            background-color: #ffffff !important;
            color: #111827 !important;
            padding: 12px !important;
            margin: 0 !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            font-size: 13px !important;
            line-height: 1.5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            width: 100% !important;
          }
          h1, h2, h3, h4, h5, h6 {
            color: #000000 !important;
            margin-top: 0 !important;
          }
          .print-header {
            border-bottom: 2px solid #b45309;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .print-header h1 {
            font-size: 20px !important;
            margin: 0 !important;
            text-transform: uppercase !important;
            letter-spacing: -0.5px !important;
            color: #b45309 !important;
            font-weight: 800 !important;
          }
          .print-header p {
            margin: 4px 0 0 0 !important;
            font-size: 12px !important;
            color: #4b5563 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 12px 0 !important;
            font-size: 12px !important;
          }
          th, td {
            border: 1px solid #d1d5db !important;
            padding: 8px 10px !important;
            text-align: left !important;
            color: #111827 !important;
          }
          th {
            background-color: #f3f4f6 !important;
            font-weight: 700 !important;
            color: #1f2937 !important;
            text-transform: uppercase !important;
            font-size: 11px !important;
          }
          pre {
            white-space: pre-wrap !important;
            font-family: inherit !important;
            font-size: 13px !important;
          }
          .no-print, button, nav, header, footer, .modal-actions {
            display: none !important;
          }
          /* High contrast text overrides */
          .text-white, .text-[#E4E4E7], .text-[#A1A1AA], .text-[#71717A] {
            color: #111827 !important;
          }
          .bg-[#111113], .bg-[#18181B], .bg-[#0A0A0B] {
            background-color: #ffffff !important;
            color: #111827 !important;
          }
          ${options.styles || ''}
        </style>
      </head>
      <body>
        ${
          docSubtitle
            ? `<div class="print-header">
                <div>
                  <h1>${docTitle}</h1>
                  <p>${docSubtitle}</p>
                </div>
                <div style="text-align:right;font-size:11px;color:#6b7280;font-family:monospace;">
                  Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
                </div>
               </div>`
            : ''
        }
        <div class="print-body">
          ${htmlContent}
        </div>
      </body>
    </html>
  `;

  // Method 1: Hidden Iframe Execution (Bulletproof in sandboxed iframes & modern browsers)
  try {
    let iframe = document.getElementById('acervus-print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'acervus-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = '0px';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printDocumentHtml);
      iframeDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print error, falling back to window.open:', err);
          fallbackWindowPrint(printDocumentHtml);
        }
      }, 400);
      return;
    }
  } catch (err) {
    console.warn('Iframe setup failed, trying popup window:', err);
  }

  // Method 2: Popup Window Fallback
  fallbackWindowPrint(printDocumentHtml);
}

function fallbackWindowPrint(htmlContent: string) {
  try {
    const printWindow = window.open('', '_blank', 'width=950,height=800');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 350);
      return;
    }
  } catch (e) {
    console.warn('Popup blocked, triggering direct window.print()', e);
  }

  window.print();
}

/**
 * Prints a specific DOM element by ID with synced form values and clean layout.
 */
export function printElementById(elementId: string, options: PrintOptions = {}) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Print Element ID '#${elementId}' not found. Fallback to full window print.`);
    window.print();
    return;
  }

  // Clone element to preserve input values, textareas and selections
  const clone = element.cloneNode(true) as HTMLElement;
  const originalInputs = element.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select'
  );
  const clonedInputs = clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select'
  );

  originalInputs.forEach((input, index) => {
    const clonedInput = clonedInputs[index];
    if (clonedInput) {
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
        clonedInput.setAttribute('value', input.value);
        if (input instanceof HTMLTextAreaElement) {
          clonedInput.textContent = input.value;
        }
      }
      if (input instanceof HTMLInputElement && (input.type === 'checkbox' || input.type === 'radio')) {
        if (input.checked) {
          clonedInput.setAttribute('checked', 'checked');
        } else {
          clonedInput.removeAttribute('checked');
        }
      }
      if (input instanceof HTMLSelectElement && clonedInput instanceof HTMLSelectElement) {
        const selectedOption = input.options[input.selectedIndex];
        if (selectedOption) {
          Array.from(clonedInput.options).forEach((opt: HTMLOptionElement) => {
            if (opt.value === selectedOption.value) {
              opt.setAttribute('selected', 'selected');
            } else {
              opt.removeAttribute('selected');
            }
          });
        }
      }
    }
  });

  printHtmlContent(clone.innerHTML, options);
}

