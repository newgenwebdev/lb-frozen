"use client";

import React, { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Papa from "papaparse";
import { createProduct, CreateProductRequest } from "@/lib/api/products";

type CSVRow = {
  title: string;
  description?: string;
  handle?: string;
  status?: string;
  price?: string;
  currency_code?: string;
  sku?: string;
  weight?: string;
  category_id?: string;
  thumbnail?: string;
  images?: string;
  option1_name?: string;
  option1_values?: string;
  option2_name?: string;
  option2_values?: string;
  variant_title?: string;
  variant_sku?: string;
  variant_price?: string;
  variant_option1?: string;
  variant_option2?: string;
};

type ImportResult = {
  success: string[];
  failed: Array<{ title: string; error: string }>;
};

type CSVImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
};

export function CSVImportModal({ isOpen, onClose, onImportComplete }: CSVImportModalProps): React.ReactPortal | null {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "complete">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setFile(null);
    setParsedData([]);
    setIsImporting(false);
    setImportProgress(0);
    setImportResult(null);
    setErrorMessage(null);
    setStep("upload");
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      setErrorMessage("Please select a CSV file");
      return;
    }

    setFile(selectedFile);
    setErrorMessage(null);

    Papa.parse<CSVRow>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setErrorMessage(`CSV parsing error: ${results.errors[0].message}`);
          return;
        }

        if (results.data.length === 0) {
          setErrorMessage("CSV file is empty");
          return;
        }

        // Validate required fields
        const invalidRows = results.data.filter((row) => {
          if (!row.title || row.title.trim() === "") {
            return true;
          }
          return false;
        });

        if (invalidRows.length > 0) {
          setErrorMessage(`${invalidRows.length} rows are missing required 'title' field`);
          return;
        }

        setParsedData(results.data);
        setStep("preview");
      },
      error: (err) => {
        setErrorMessage(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      const fakeEvent = {
        target: { files: [droppedFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(fakeEvent);
    } else {
      setErrorMessage("Please drop a CSV file");
    }
  }, [handleFileChange]);

  const convertCSVToProducts = useCallback((rows: CSVRow[]): CreateProductRequest[] => {
    // Group rows by product title (for products with variants)
    const productGroups = new Map<string, CSVRow[]>();

    rows.forEach((row) => {
      const key = row.title.trim();
      if (!productGroups.has(key)) {
        productGroups.set(key, []);
      }
      productGroups.get(key)!.push(row);
    });

    const products: CreateProductRequest[] = [];

    productGroups.forEach((groupRows, title) => {
      const firstRow = groupRows[0];

      // Parse options from first row
      const options: Array<{ title: string; values: string[] }> = [];
      const optionValuesSet: Record<string, Set<string>> = {};

      if (firstRow.option1_name) {
        options.push({ title: firstRow.option1_name, values: [] });
        optionValuesSet[firstRow.option1_name] = new Set();
      }
      if (firstRow.option2_name) {
        options.push({ title: firstRow.option2_name, values: [] });
        optionValuesSet[firstRow.option2_name] = new Set();
      }

      // If option values are provided in first row, use those
      if (firstRow.option1_values && firstRow.option1_name) {
        firstRow.option1_values.split("|").forEach((v) => {
          optionValuesSet[firstRow.option1_name!].add(v.trim());
        });
      }
      if (firstRow.option2_values && firstRow.option2_name) {
        firstRow.option2_values.split("|").forEach((v) => {
          optionValuesSet[firstRow.option2_name!].add(v.trim());
        });
      }

      // Collect option values from variants
      groupRows.forEach((row) => {
        if (row.variant_option1 && firstRow.option1_name) {
          optionValuesSet[firstRow.option1_name].add(row.variant_option1.trim());
        }
        if (row.variant_option2 && firstRow.option2_name) {
          optionValuesSet[firstRow.option2_name].add(row.variant_option2.trim());
        }
      });

      // Set collected option values
      options.forEach((opt) => {
        opt.values = Array.from(optionValuesSet[opt.title] || []);
      });

      // Parse images
      const images: Array<{ url: string }> = [];
      if (firstRow.images) {
        firstRow.images.split("|").forEach((url) => {
          if (url.trim()) {
            images.push({ url: url.trim() });
          }
        });
      }

      // Build variants
      const hasVariants = groupRows.some((r) => r.variant_title || r.variant_sku);
      const variants: CreateProductRequest["variants"] = [];

      if (hasVariants && options.length > 0) {
        groupRows.forEach((row) => {
          if (row.variant_title || row.variant_sku) {
            const variantOptions: Record<string, string> = {};
            if (row.variant_option1 && firstRow.option1_name) {
              variantOptions[firstRow.option1_name] = row.variant_option1;
            }
            if (row.variant_option2 && firstRow.option2_name) {
              variantOptions[firstRow.option2_name] = row.variant_option2;
            }

            variants.push({
              title: row.variant_title || row.variant_sku || "Default",
              sku: row.variant_sku || undefined,
              prices: [{
                currency_code: row.currency_code?.toLowerCase() || "sgd",
                amount: Math.round(parseFloat(row.variant_price || row.price || "0") * 100),
              }],
              options: Object.keys(variantOptions).length > 0 ? variantOptions : undefined,
              manage_inventory: true,
              allow_backorder: false,
            });
          }
        });
      } else {
        // Single variant product
        variants.push({
          title: "Default",
          sku: firstRow.sku || undefined,
          prices: [{
            currency_code: firstRow.currency_code?.toLowerCase() || "sgd",
            amount: Math.round(parseFloat(firstRow.price || "0") * 100),
          }],
          manage_inventory: true,
          allow_backorder: false,
        });
      }

      // Parse categories
      const categories: Array<{ id: string }> = [];
      if (firstRow.category_id) {
        firstRow.category_id.split("|").forEach((id) => {
          if (id.trim()) {
            categories.push({ id: id.trim() });
          }
        });
      }

      const product: CreateProductRequest = {
        title: title,
        description: firstRow.description || undefined,
        handle: firstRow.handle || undefined,
        status: (firstRow.status as "draft" | "published") || "draft",
        thumbnail: firstRow.thumbnail || undefined,
        images: images.length > 0 ? images : undefined,
        categories: categories.length > 0 ? categories : undefined,
        weight: firstRow.weight ? parseFloat(firstRow.weight) : undefined,
        options: options.length > 0 ? options : [{ title: "Default", values: ["Default"] }],
        variants: variants,
      };

      products.push(product);
    });

    return products;
  }, []);

  const handleImport = useCallback(async () => {
    if (parsedData.length === 0) return;

    setStep("importing");
    setIsImporting(true);
    setImportProgress(0);

    const products = convertCSVToProducts(parsedData);
    const result: ImportResult = { success: [], failed: [] };

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      try {
        await createProduct(product);
        result.success.push(product.title);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        result.failed.push({ title: product.title, error: errorMessage });
      }
      setImportProgress(Math.round(((i + 1) / products.length) * 100));
    }

    setImportResult(result);
    setIsImporting(false);
    setStep("complete");

    if (result.success.length > 0) {
      onImportComplete();
    }
  }, [parsedData, convertCSVToProducts, onImportComplete]);

  const downloadTemplate = useCallback(() => {
    const template = `title,description,handle,status,price,currency_code,sku,weight,category_id,thumbnail,images,option1_name,option1_values,option2_name,option2_values,variant_title,variant_sku,variant_price,variant_option1,variant_option2
"Sample Product","Product description","sample-product","draft","100","sgd","SKU001","500","","https://example.com/thumb.jpg","https://example.com/img1.jpg|https://example.com/img2.jpg","","","","","","","","",""
"Product with Variants","A product with size options","product-variants","draft","","sgd","","","","","","Size","S|M|L","","","Small","SKU-S","50","S",""
"Product with Variants","","","","","","","","","","","","","","","Medium","SKU-M","55","M",""
"Product with Variants","","","","","","","","","","","","","","","Large","SKU-L","60","L",""`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-semibold text-[#030712]">Import Products from CSV</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === "upload" && (
            <div className="space-y-6">
              {/* Template Download */}
              <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <div>
                  <p className="text-sm font-medium text-[#030712]">Need a template?</p>
                  <p className="text-sm text-[#6B7280]">Download our CSV template to get started</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="px-4 py-2 text-sm font-medium text-[#030712] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
                >
                  Download Template
                </button>
              </div>

              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  errorMessage ? "border-red-300 bg-red-50" : "border-[#E5E7EB] hover:border-[#030712] hover:bg-[#F9FAFB]"
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-4">
                  <path d="M24 34V14M24 14L16 22M24 14L32 22" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M40 42H8" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-sm font-medium text-[#030712] mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-[#6B7280]">CSV files only</p>
              </div>

              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{errorMessage}</p>
                </div>
              )}

              {/* CSV Format Info */}
              <div className="text-sm text-[#6B7280]">
                <p className="font-medium text-[#030712] mb-2">Supported columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code className="text-xs bg-[#F3F4F6] px-1 py-0.5 rounded">title</code> (required) - Product name</li>
                  <li><code className="text-xs bg-[#F3F4F6] px-1 py-0.5 rounded">description</code> - Product description</li>
                  <li><code className="text-xs bg-[#F3F4F6] px-1 py-0.5 rounded">price</code> - Price in your currency (e.g., 100.00)</li>
                  <li><code className="text-xs bg-[#F3F4F6] px-1 py-0.5 rounded">sku</code> - Stock keeping unit</li>
                  <li><code className="text-xs bg-[#F3F4F6] px-1 py-0.5 rounded">status</code> - draft or published</li>
                  <li><code className="text-xs bg-[#F3F4F6] px-1 py-0.5 rounded">option1_name, option1_values</code> - First option (e.g., Size, S|M|L)</li>
                  <li><code className="text-xs bg-[#F3F4F6] px-1 py-0.5 rounded">variant_*</code> - Variant-specific fields</li>
                </ul>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#030712]">File: {file?.name}</p>
                  <p className="text-sm text-[#6B7280]">{parsedData.length} rows found</p>
                </div>
                <button
                  onClick={resetState}
                  className="text-sm text-[#6B7280] hover:text-[#030712] transition-colors"
                >
                  Change file
                </button>
              </div>

              {/* Preview Table */}
              <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F9FAFB] sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-[#6B7280]">#</th>
                        <th className="px-4 py-2 text-left font-medium text-[#6B7280]">Title</th>
                        <th className="px-4 py-2 text-left font-medium text-[#6B7280]">Price</th>
                        <th className="px-4 py-2 text-left font-medium text-[#6B7280]">SKU</th>
                        <th className="px-4 py-2 text-left font-medium text-[#6B7280]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 10).map((row, index) => (
                        <tr key={index} className="border-t border-[#E5E7EB]">
                          <td className="px-4 py-2 text-[#6B7280]">{index + 1}</td>
                          <td className="px-4 py-2 text-[#030712]">{row.title}</td>
                          <td className="px-4 py-2 text-[#030712]">{row.price || row.variant_price || "-"}</td>
                          <td className="px-4 py-2 text-[#6B7280]">{row.sku || row.variant_sku || "-"}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              row.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                            }`}>
                              {row.status || "draft"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 10 && (
                  <div className="px-4 py-2 bg-[#F9FAFB] text-sm text-[#6B7280] border-t border-[#E5E7EB]">
                    ... and {parsedData.length - 10} more rows
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F3F4F6] mb-4">
                  <svg className="animate-spin h-8 w-8 text-[#030712]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <p className="text-lg font-medium text-[#030712] mb-2">Importing products...</p>
                <p className="text-sm text-[#6B7280]">Please wait while we create your products</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                <div
                  className="bg-[#030712] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-center text-sm text-[#6B7280]">{importProgress}% complete</p>
            </div>
          )}

          {step === "complete" && importResult && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="flex items-center gap-4">
                {importResult.failed.length === 0 ? (
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17L4 12" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
                <div>
                  <p className="text-lg font-medium text-[#030712]">
                    {importResult.failed.length === 0 ? "Import Complete!" : "Import Completed with Errors"}
                  </p>
                  <p className="text-sm text-[#6B7280]">
                    {importResult.success.length} products imported successfully
                    {importResult.failed.length > 0 && `, ${importResult.failed.length} failed`}
                  </p>
                </div>
              </div>

              {/* Failed Items */}
              {importResult.failed.length > 0 && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                    <p className="text-sm font-medium text-red-700">Failed imports</p>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {importResult.failed.map((item, index) => (
                      <div key={index} className="px-4 py-2 border-b border-red-100 last:border-0">
                        <p className="text-sm font-medium text-[#030712]">{item.title}</p>
                        <p className="text-xs text-red-600">{item.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
          {step === "upload" && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:text-[#030712] transition-colors"
            >
              Cancel
            </button>
          )}

          {step === "preview" && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:text-[#030712] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 text-sm font-medium text-white bg-[#030712] rounded-lg hover:bg-[#1f2937] transition-colors"
              >
                Import {parsedData.length} Products
              </button>
            </>
          )}

          {step === "complete" && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-white bg-[#030712] rounded-lg hover:bg-[#1f2937] transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
