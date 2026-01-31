/* GLOBAL STATE VARIABLES */

// Array to store invoice line items
var items = [];

// Current invoice number counter
var invoiceNumber = 1001;

// Invoice history storage
var invoiceHistory = [];

/* Currency exchange rates relative to USD
 * Used for converting totals to different currencies */
var exchangeRates = {
    USD: 1,
    EUR: 0.92,
    BOB: 6.91
};

/* Currency symbols for display formatting */
var currencySymbols = {
    USD: '$',
    EUR: '€',
    BOB: 'Bs'
};

/* BLOCKCHAIN FUNCTIONS */

/**
 * Generate SHA-256 hash using Web Crypto API
 * @param {string} message - Message to hash
 * @returns {Promise<string>} Hexadecimal hash string
 */
function generateHash(message) {
    var msgBuffer = new TextEncoder().encode(JSON.stringify(message));
    return crypto.subtle.digest('SHA-256', msgBuffer).then(function(hashBuffer) {
        var hashArray = Array.from(new Uint8Array(hashBuffer));
        var hashHex = hashArray.map(function(b) {
            return b.toString(16).padStart(2, '0');
        }).join('');
        return hashHex;
    });
}

/**
 * Create blockchain data structure for invoice
 * @param {Object} invoiceData - Invoice information
 * @returns {Promise<Object>} Block with hash and timestamp
 */
function generateBlockchainData(invoiceData) {
    var timestamp = new Date().toISOString();
    var blockData = {
        invoiceNumber: invoiceData.invoiceNumber,
        clientName: invoiceData.clientName,
        total: invoiceData.total,
        timestamp: timestamp,
        items: invoiceData.items.map(function(item) {
            return {
                name: item.name,
                quantity: item.quantity,
                price: item.price
            };
        })
    };
    
    return generateHash(blockData).then(function(hash) {
        return {
            hash: hash,
            timestamp: timestamp,
            data: blockData
        };
    });
}

/* ITEM VALIDATION FUNCTIONS */

/**
 * Validate item form inputs before adding to invoice
 * @returns {boolean} True if all inputs are valid
 */
function validateItem() {
    var name = document.getElementById('itemName').value.trim();
    var quantity = parseFloat(document.getElementById('itemQuantity').value);
    var price = parseFloat(document.getElementById('itemPrice').value);

    var isValid = true;

    // Clear previous validation errors
    document.getElementById('nameError').textContent = '';
    document.getElementById('quantityError').textContent = '';
    document.getElementById('priceError').textContent = '';
    document.getElementById('itemName').classList.remove('error');
    document.getElementById('itemQuantity').classList.remove('error');
    document.getElementById('itemPrice').classList.remove('error');

    // Validate item name is not empty
    if (!name) {
        document.getElementById('nameError').textContent = 'Item name is required';
        document.getElementById('itemName').classList.add('error');
        isValid = false;
    }

    // Validate quantity is positive
    if (!quantity || quantity <= 0) {
        document.getElementById('quantityError').textContent = 'Quantity must be greater than 0';
        document.getElementById('itemQuantity').classList.add('error');
        isValid = false;
    }

    // Validate price is positive
    if (!price || price <= 0) {
        document.getElementById('priceError').textContent = 'Price must be greater than 0';
        document.getElementById('itemPrice').classList.add('error');
        isValid = false;
    }

    return isValid;
}

/* ITEM MANAGEMENT FUNCTIONS */

/**
 * Add validated item to invoice
 */
function addItem() {
    if (!validateItem()) return;

    var item = {
        id: Date.now(),
        name: document.getElementById('itemName').value.trim(),
        quantity: parseFloat(document.getElementById('itemQuantity').value),
        price: parseFloat(document.getElementById('itemPrice').value)
    };

    items.push(item);
    
    // Clear form inputs after adding item
    document.getElementById('itemName').value = '';
    document.getElementById('itemQuantity').value = '';
    document.getElementById('itemPrice').value = '';

    updateDisplay();
}

/**
 * Remove item from invoice by ID
 * @param {number} id - Unique identifier of item to remove
 */
function removeItem(id) {
    items = items.filter(function(item) {
        return item.id !== id;
    });
    updateDisplay();
}

/* CALCULATION FUNCTIONS*/

/**
 * Get tax rate from input, validated between 0-100
 * @returns {number} Tax rate as decimal (0-1)
 */
function getTaxRate() {
    var taxRateInput = document.getElementById('taxRate').value;
    var taxRate = parseFloat(taxRateInput) || 13;
    // Ensure tax rate is between 0 and 100
    if (taxRate < 0) taxRate = 0;
    if (taxRate > 100) taxRate = 100;
    return taxRate / 100; // Convert percentage to decimal
}

/**
 * Calculate invoice totals including subtotal, tax, and converted total
 * @returns {Object} Calculation results with all financial data
 */
function calculateTotals() {
    var subtotal = items.reduce(function(sum, item) {
        return sum + (item.quantity * item.price);
    }, 0);
    var taxRate = getTaxRate();
    var tax = subtotal * taxRate;
    var total = subtotal + tax;
    
    var currency = document.getElementById('currency').value;
    var convertedTotal = total * exchangeRates[currency];

    return { 
        subtotal: subtotal, 
        tax: tax, 
        total: total, 
        convertedTotal: convertedTotal, 
        currency: currency,
        taxRate: taxRate * 100 // Return as percentage for display
    };
}

/* DISPLAY UPDATE FUNCTIONS */

/**
 * Update the invoice display including items table and totals
 */
function updateDisplay() {
    var tbody = document.getElementById('itemsTable');
    tbody.innerHTML = '';

    // Show empty state if no items
    if (items.length === 0) {
        document.getElementById('itemsCard').style.display = 'none';
        document.getElementById('summaryCard').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('qrSection').style.display = 'none';
        return;
    }

    // Show items and summary cards
    document.getElementById('itemsCard').style.display = 'block';
    document.getElementById('summaryCard').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';

    // Render items in table
    items.forEach(function(item) {
        var row = tbody.insertRow();
        row.innerHTML = 
            '<td>' + item.name + '</td>' +
            '<td style="text-align: center;">' + item.quantity + '</td>' +
            '<td style="text-align: right;">$' + item.price.toFixed(2) + '</td>' +
            '<td style="text-align: right; font-weight: 600;">$' + (item.quantity * item.price).toFixed(2) + '</td>' +
            '<td style="text-align: center;">' +
                '<button class="btn-delete-item" onclick="removeItem(' + item.id + ')" title="Delete item">' +
                    '<svg class="icon-delete-x" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                        '<path d="M12 4L4 12M4 4L12 12" stroke="#e74c3c" stroke-width="2" stroke-linecap="round"/>' +
                    '</svg>' +
                '</button>' +
            '</td>';
    });

    // Update totals display
    var totals = calculateTotals();
    document.getElementById('subtotalAmount').textContent = '$' + totals.subtotal.toFixed(2);
    document.getElementById('taxAmount').textContent = '$' + totals.tax.toFixed(2);
    document.getElementById('totalAmount').textContent = '$' + totals.total.toFixed(2);
    document.getElementById('selectedCurrency').textContent = totals.currency;
    document.getElementById('convertedAmount').textContent = 
        currencySymbols[totals.currency] + totals.convertedTotal.toFixed(2);
    document.getElementById('taxRateDisplay').textContent = totals.taxRate.toFixed(2);

    // Generate blockchain verification
    var clientName = document.getElementById('clientName').value || 'General Client';
    var invoiceData = {
        invoiceNumber: invoiceNumber,
        clientName: clientName,
        total: totals.total,
        items: items
    };

    generateBlockchainData(invoiceData).then(function(blockData) {
        document.getElementById('hashDisplay').textContent = blockData.hash;
        
        // Generate QR Code
        document.getElementById('qrcode').innerHTML = '';
        var qrData = 'INVOICE:' + invoiceNumber + '|HASH:' + blockData.hash.substring(0, 16);
        
        new QRCode(document.getElementById('qrcode'), {
            text: qrData,
            width: 180,
            height: 180,
            colorDark: '#667eea',
            colorLight: '#ffffff'
        });
        
        document.getElementById('qrSection').style.display = 'block';
        
        // Store for PDF generation
        window.currentInvoiceHash = blockData.hash;
        window.currentInvoiceTimestamp = blockData.timestamp;
    });
}

/* PDF GENERATION FUNCTIONS */

/**
 * Generate PDF invoice using jsPDF library
 */
function generatePDF() {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF();
    
    var clientName = document.getElementById('clientName').value || 'General Client';
    var fiscalField = document.getElementById('fiscalField').value || '';
    var totals = calculateTotals();
    var currentDate = new Date().toLocaleDateString('en-US');

    // PDF Header - Rounded gradient banner
    doc.setFillColor(102, 126, 234);
    doc.roundedRect(10, 10, 190, 35, 5, 5, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.text('NanoHash Invoice', 105, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('Invoice #' + invoiceNumber, 105, 35, { align: 'center' });

    // Client Information Section with rounded container
    var yPos = 55;
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(15, yPos - 5, 180, fiscalField ? 35 : 25, 3, 3, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Client Information:', 20, yPos + 3);
    doc.setFont(undefined, 'normal');
    doc.text(clientName, 60, yPos + 3);
    
    yPos += 8;
    if (fiscalField) {
        doc.setFont(undefined, 'bold');
        doc.text('Fiscal Field:', 20, yPos + 3);
        doc.setFont(undefined, 'normal');
        doc.text(fiscalField, 60, yPos + 3);
        yPos += 8;
    }
    
    doc.setFont(undefined, 'bold');
    doc.text('Date:', 20, yPos + 3);
    doc.setFont(undefined, 'normal');
    doc.text(currentDate, 60, yPos + 3);

    // Security Badge - Rounded box
    yPos += 15;
    doc.setFillColor(17, 153, 142);
    doc.roundedRect(15, yPos, 180, 20, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('Blockchain Verified | SHA-256 Hash:', 20, yPos + 7);
    
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    var hash = window.currentInvoiceHash || 'N/A';
    doc.text(hash.substring(0, 65), 20, yPos + 13);
    doc.text(hash.substring(65), 20, yPos + 17);

    // Items Table with rounded header
    yPos += 30;
    doc.setFillColor(102, 126, 234);
    doc.roundedRect(15, yPos, 180, 10, 2, 2, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Item', 20, yPos + 7);
    doc.text('Quantity ', 110, yPos + 7);
    doc.text('Price', 135, yPos + 7);
    doc.text('Subtotal', 170, yPos + 7);

    // Items Body with alternating background
    yPos += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    
    items.forEach(function(item, index) {
        if (index % 2 === 0) {
            doc.setFillColor(248, 249, 250);
            doc.roundedRect(15, yPos - 4, 180, 8, 1, 1, 'F');
        }
        
        doc.text(item.name.substring(0, 40), 20, yPos);
        doc.text(item.quantity.toString(), 110, yPos);
        doc.text('$' + item.price.toFixed(2), 135, yPos);
        doc.text('$' + (item.quantity * item.price).toFixed(2), 170, yPos);
        yPos += 10;
    });

    // Summary Section with rounded container
    yPos += 10;
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(15, yPos, 180, 40, 3, 3, 'F');
    
    yPos += 10;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    
    doc.text('Subtotal:', 120, yPos);
    doc.text('$' + totals.subtotal.toFixed(2), 170, yPos);
    yPos += 8;

    doc.text('Tax (' + totals.taxRate.toFixed(2) + '%):', 120, yPos);
    doc.text('$' + totals.tax.toFixed(2), 170, yPos);
    yPos += 12;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(102, 126, 234);
    doc.text('TOTAL (USD):', 120, yPos);
    doc.text('$' + totals.total.toFixed(2), 170, yPos);
    yPos += 8;

    doc.setTextColor(17, 153, 142);
    doc.text('TOTAL (' + totals.currency + '):', 120, yPos);
    doc.text(currencySymbols[totals.currency] + totals.convertedTotal.toFixed(2), 170, yPos);

    // QR Code Section
    yPos += 20;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, yPos, 50, 50, 3, 3, 'F');
    
    var qrCanvas = document.querySelector('#qrcode canvas');
    if (qrCanvas) {
        var qrImage = qrCanvas.toDataURL('image/png');
        doc.addImage(qrImage, 'PNG', 18, yPos + 3, 44, 44);
    }

    doc.setFontSize(9);
    doc.setTextColor(102, 126, 234);
    doc.setFont(undefined, 'bold');
    doc.text('Scan to Verify', 70, yPos + 15);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Blockchain verification ensures', 70, yPos + 22);
    doc.text('invoice authenticity and prevents', 70, yPos + 27);
    doc.text('tampering or duplication.', 70, yPos + 32);

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.text('NanoHash Invoice - Blockchain Verified & Cryptographically Secured', 105, 285, { align: 'center' });

    // Save to history
    saveToHistory({
        invoiceNumber: invoiceNumber,
        clientName: clientName,
        fiscalField: fiscalField,
        total: totals.total,
        currency: totals.currency,
        convertedTotal: totals.convertedTotal,
        date: currentDate,
        hash: window.currentInvoiceHash,
        timestamp: window.currentInvoiceTimestamp,
        items: JSON.parse(JSON.stringify(items))
    });

    // Save PDF
    doc.save('NanoHash_Invoice_' + invoiceNumber + '_' + Date.now() + '.pdf');
    
    // Increment invoice number
    invoiceNumber++;
    localStorage.setItem('invoiceNumber', invoiceNumber);
    document.getElementById('invoiceNumber').textContent = invoiceNumber;
    
    // Clear items
    items = [];
    updateDisplay();
}
/* HISTORY FUNCTIONS */

/**
 * Save invoice to history
 * @param {Object} invoiceData - Invoice data to save
 */
function saveToHistory(invoiceData) {
    invoiceHistory.unshift(invoiceData);
    if (invoiceHistory.length > 50) {
        invoiceHistory = invoiceHistory.slice(0, 50);
    }
    localStorage.setItem('invoiceHistory', JSON.stringify(invoiceHistory));
}

/**
 * Show invoice history modal
 */
function showHistory() {
    var historyList = document.getElementById('historyList');
    
    if (invoiceHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-history">' +
            '<div class="icon">$</div>' +
            '<h3 style="margin-bottom: 10px;">No invoices in history</h3>' +
            '<p>Generated invoices will appear here</p>' +
        '</div>';
    } else {
        historyList.innerHTML = invoiceHistory.map(function(invoice, index) {
            return '<div class="history-item">' +
                '<div class="history-item-header">' +
                    '<div class="history-item-title">Invoice #' + invoice.invoiceNumber + '</div>' +
                    '<div class="history-actions">' +
                        '<button class="btn btn-primary btn-small" onclick="viewInvoiceDetails(' + index + ')">View Details</button>' +
                        '<button class="btn btn-danger btn-small" onclick="deleteInvoice(' + index + ')">Delete</button>' +
                    '</div>' +
                '</div>' +
                '<div class="history-item-details">' +
                    '<strong>Client:</strong> ' + invoice.clientName + '<br>' +
                    '<strong>Date:</strong> ' + invoice.date + '<br>' +
                    '<strong>Total:</strong> $' + invoice.total.toFixed(2) + ' (' + currencySymbols[invoice.currency] + invoice.convertedTotal.toFixed(2) + ' ' + invoice.currency + ')' +
                '</div>' +
                '<div class="history-item-hash">' +
                    '✓ Hash: ' + (invoice.hash ? invoice.hash.substring(0, 32) + '...' : 'N/A') +
                '</div>' +
            '</div>';
        }).join('');
    }
    
    document.getElementById('historyModal').style.display = 'block';
}

/**
 * Close history modal
 */
function closeHistory() {
    document.getElementById('historyModal').style.display = 'none';
}

/**
 * View detailed invoice information
 * @param {number} index - Index of invoice in history
 */
function viewInvoiceDetails(index) {
    var invoice = invoiceHistory[index];
    var itemsList = invoice.items.map(function(item, i) {
        return '<div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">' +
            '<span>' + (i + 1) + '. ' + item.name + '</span>' +
            '<span>' + item.quantity + ' x $' + item.price.toFixed(2) + ' = $' + (item.quantity * item.price).toFixed(2) + '</span>' +
        '</div>';
    }).join('');

    var detailsHtml = '<div class="history-item" style="text-align: left;">' +
        '<div class="history-item-header">' +
            '<div class="history-item-title">Invoice #' + invoice.invoiceNumber + '</div>' +
        '</div>' +
        '<div class="history-item-details">' +
            '<strong>Client:</strong> ' + invoice.clientName + '<br>' +
            (invoice.fiscalField ? '<strong>Fiscal Field:</strong> ' + invoice.fiscalField + '<br>' : '') +
            '<strong>Date:</strong> ' + invoice.date + '<br>' +
            '<strong>Total:</strong> $' + invoice.total.toFixed(2) + ' (' + currencySymbols[invoice.currency] + invoice.convertedTotal.toFixed(2) + ' ' + invoice.currency + ')' +
        '</div>' +
        '<div style="margin: 15px 0;">' +
            '<strong>Items:</strong>' +
            '<div style="margin-top: 10px;">' + itemsList + '</div>' +
        '</div>' +
        '<div class="history-item-hash">' +
            '✓ SHA-256 Hash:<br>' + (invoice.hash || 'N/A') +
        '</div>' +
        '<div style="margin-top: 15px;">' +
            '<button class="btn btn-primary btn-small" onclick="regenerateInvoice(' + index + ')">Regenerate PDF</button>' +
        '</div>' +
    '</div>';

    document.getElementById('historyList').innerHTML = detailsHtml;
}

/**
 * Delete invoice from history
 * @param {number} index - Index of invoice to delete
 */
function deleteInvoice(index) {
    if (confirm('Are you sure you want to delete this invoice from history?')) {
        invoiceHistory.splice(index, 1);
        localStorage.setItem('invoiceHistory', JSON.stringify(invoiceHistory));
        showHistory();
    }
}

/**
 * Regenerate PDF from history
 * @param {number} index - Index of invoice in history
 */
function regenerateInvoice(index) {
    var invoice = invoiceHistory[index];
    items = invoice.items;
    invoiceNumber = invoice.invoiceNumber;
    
    document.getElementById('clientName').value = invoice.clientName;
    document.getElementById('fiscalField').value = invoice.fiscalField || '';
    document.getElementById('invoiceNumber').textContent = invoiceNumber;
    
    updateDisplay();
    closeHistory();
}

/* EVENT LISTENERS */

// Currency change listener - refreshes display when currency changes
document.getElementById('currency').addEventListener('change', updateDisplay);

// Tax rate input listener - updates display in real-time
document.getElementById('taxRate').addEventListener('input', updateDisplay);

/* THEME MANAGEMENT */

/**
 * Apply theme (light or dark mode)
 * @param {string} theme1 - Theme name ('light' or 'dark')
 */
function setTheme(theme) {
    var body = document.body;
    var btnLight = document.getElementById('btnLight');
    var btnDark = document.getElementById('btnDark');
    
    if (theme === 'dark') {
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        btnDark.classList.add('active');
        btnLight.classList.remove('active');
    } else {
        body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        btnLight.classList.add('active');
        btnDark.classList.remove('active');
    }
}

/* INITIALIZATION */

// Initialize theme on DOM ready
window.addEventListener('DOMContentLoaded', function() {
    var savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // Load invoice number from localStorage
    var savedInvoiceNumber = localStorage.getItem('invoiceNumber');
    if (savedInvoiceNumber) {
        invoiceNumber = parseInt(savedInvoiceNumber);
        document.getElementById('invoiceNumber').textContent = invoiceNumber;
    }
    
    // Load invoice history from localStorage
    var savedHistory = localStorage.getItem('invoiceHistory');
    if (savedHistory) {
        invoiceHistory = JSON.parse(savedHistory);
    }
});

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    var modal = document.getElementById('historyModal');
    if (event.target === modal) {
        closeHistory();
    }
});
