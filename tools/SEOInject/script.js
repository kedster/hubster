// Global variables
let uploadedFile = null;
let currentFormData = {};

// DOM elements
const elements = {
    form: document.getElementById('seoForm'),
    fileInput: document.getElementById('fileInput'),
    uploadArea: document.getElementById('uploadArea'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileSize: document.getElementById('fileSize'),
    processBtn: document.getElementById('processBtn'),
    statusMessage: document.getElementById('statusMessage'),
    previewSection: document.getElementById('previewSection'),
    schemaType: document.getElementById('schemaType'),
    schemaFields: document.getElementById('schemaFields'),
    
    // Character counters
    metaTitle: document.getElementById('metaTitle'),
    metaDescription: document.getElementById('metaDescription'),
    
    // Preview elements
    previewTitle: document.getElementById('previewTitle'),
    previewUrl: document.getElementById('previewUrl'),
    previewDescription: document.getElementById('previewDescription'),
    previewOgTitle: document.getElementById('previewOgTitle'),
    previewOgDescription: document.getElementById('previewOgDescription'),
    previewOgImage: document.getElementById('previewOgImage'),
    previewDomain: document.getElementById('previewDomain')
};

// Schema field templates
const schemaTemplates = {
    Article: [
        { id: 'articleHeadline', label: 'Headline', type: 'text', required: true },
        { id: 'articleAuthor', label: 'Author', type: 'text', required: true },
        { id: 'articleDatePublished', label: 'Date Published', type: 'date', required: true },
        { id: 'articleDateModified', label: 'Date Modified', type: 'date' },
        { id: 'articleImage', label: 'Image URL', type: 'url' }
    ],
    Product: [
        { id: 'productName', label: 'Product Name', type: 'text', required: true },
        { id: 'productBrand', label: 'Brand', type: 'text' },
        { id: 'productPrice', label: 'Price', type: 'number', required: true },
        { id: 'productCurrency', label: 'Currency', type: 'text', value: 'USD' },
        { id: 'productAvailability', label: 'Availability', type: 'select', options: ['InStock', 'OutOfStock', 'PreOrder'] },
        { id: 'productRating', label: 'Rating (1-5)', type: 'number', min: 1, max: 5 }
    ],
    Organization: [
        { id: 'orgName', label: 'Organization Name', type: 'text', required: true },
        { id: 'orgUrl', label: 'Website URL', type: 'url' },
        { id: 'orgLogo', label: 'Logo URL', type: 'url' },
        { id: 'orgDescription', label: 'Description', type: 'textarea' }
    ],
    LocalBusiness: [
        { id: 'businessName', label: 'Business Name', type: 'text', required: true },
        { id: 'businessAddress', label: 'Address', type: 'text', required: true },
        { id: 'businessPhone', label: 'Phone', type: 'tel' },
        { id: 'businessHours', label: 'Opening Hours', type: 'text', placeholder: 'Mo-Fr 09:00-17:00' }
    ],
    WebSite: [
        { id: 'websiteName', label: 'Website Name', type: 'text', required: true },
        { id: 'websiteUrl', label: 'Website URL', type: 'url', required: true },
        { id: 'websiteDescription', label: 'Description', type: 'textarea' }
    ]
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeCharacterCounters();
    updatePreview();
});

// Event Listeners
function initializeEventListeners() {
    // File upload events
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Form events
    elements.form.addEventListener('input', handleFormChange);
    elements.schemaType.addEventListener('change', handleSchemaTypeChange);
    
    // Process button
    elements.processBtn.addEventListener('click', processFile);
}

// Character counter initialization
function initializeCharacterCounters() {
    const counters = [
        { element: elements.metaTitle, max: 60 },
        { element: elements.metaDescription, max: 160 }
    ];
    
    counters.forEach(counter => {
        const updateCounter = () => {
            const length = counter.element.value.length;
            const counterElement = counter.element.nextElementSibling;
            
            counterElement.textContent = `${length}/${counter.max} characters`;
            
            // Update styling based on length
            counterElement.classList.remove('warning', 'error');
            if (length > counter.max * 0.9) {
                counterElement.classList.add('warning');
            }
            if (length > counter.max) {
                counterElement.classList.add('error');
            }
        };
        
        counter.element.addEventListener('input', updateCounter);
        updateCounter(); // Initial call
    });
}

// File upload handlers
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    if (!file.type.includes('text/html') && !file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
        showStatus('Please select a valid HTML file.', 'error');
        return;
    }
    
    uploadedFile = file;
    
    // Update file info
    elements.fileName.textContent = file.name;
    elements.fileSize.textContent = formatFileSize(file.size);
    elements.fileInfo.style.display = 'block';
    
    // Enable process button
    elements.processBtn.disabled = false;
    
    showStatus('HTML file loaded successfully!', 'success');
}

// Form handling
function handleFormChange() {
    currentFormData = collectFormData();
    updatePreview();
}

function handleSchemaTypeChange() {
    const schemaType = elements.schemaType.value;
    const schemaFieldsContainer = elements.schemaFields;
    
    if (schemaType === 'none') {
        schemaFieldsContainer.style.display = 'none';
        return;
    }
    
    const template = schemaTemplates[schemaType];
    if (!template) return;
    
    // Generate schema fields
    let html = `<h4>Configure ${schemaType} Data</h4>`;
    template.forEach(field => {
        html += generateSchemaField(field);
    });
    
    schemaFieldsContainer.innerHTML = html;
    schemaFieldsContainer.style.display = 'block';
    
    // Add event listeners to new fields
    schemaFieldsContainer.addEventListener('input', handleFormChange);
}

function generateSchemaField(field) {
    const required = field.required ? ' required' : '';
    const value = field.value ? ` value="${field.value}"` : '';
    const placeholder = field.placeholder ? ` placeholder="${field.placeholder}"` : '';
    const min = field.min ? ` min="${field.min}"` : '';
    const max = field.max ? ` max="${field.max}"` : '';
    
    let input = '';
    
    switch (field.type) {
        case 'textarea':
            input = `<textarea id="${field.id}"${placeholder}${required}></textarea>`;
            break;
        case 'select':
            const options = field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
            input = `<select id="${field.id}"${required}>${options}</select>`;
            break;
        default:
            input = `<input type="${field.type}" id="${field.id}"${value}${placeholder}${min}${max}${required}>`;
    }
    
    return `
        <div class="form-group">
            <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
            ${input}
        </div>
    `;
}

// Data collection
function collectFormData() {
    const data = {};
    
    // Basic form fields
    const fields = [
        'metaTitle', 'metaDescription', 'keywords', 'canonicalUrl', 'language',
        'ogTitle', 'ogDescription', 'ogImage', 'ogType',
        'twitterCard', 'twitterSite', 'schemaType', 'robots', 'author'
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            data[field] = element.value.trim();
        }
    });
    
    // Collect schema-specific fields
    if (data.schemaType && data.schemaType !== 'none') {
        const template = schemaTemplates[data.schemaType];
        if (template) {
            data.schemaData = {};
            template.forEach(field => {
                const element = document.getElementById(field.id);
                if (element) {
                    data.schemaData[field.id] = element.value.trim();
                }
            });
        }
    }
    
    return data;
}

// Preview updates
function updatePreview() {
    const data = currentFormData;
    
    // Google preview
    elements.previewTitle.textContent = data.metaTitle || 'Your Page Title';
    elements.previewDescription.textContent = data.metaDescription || 'Your meta description will appear here...';
    
    if (data.canonicalUrl) {
        try {
            elements.previewUrl.textContent = data.canonicalUrl;
            const domain = new URL(data.canonicalUrl).hostname.toUpperCase();
            elements.previewDomain.textContent = domain;
        } catch (e) {
            elements.previewUrl.textContent = 'https://example.com';
            elements.previewDomain.textContent = 'EXAMPLE.COM';
        }
    } else {
        elements.previewUrl.textContent = 'https://example.com';
        elements.previewDomain.textContent = 'EXAMPLE.COM';
    }
    
    // Facebook preview
    elements.previewOgTitle.textContent = data.ogTitle || data.metaTitle || 'Your Page Title';
    elements.previewOgDescription.textContent = data.ogDescription || data.metaDescription || 'Your description...';
    
    if (data.ogImage) {
        elements.previewOgImage.style.backgroundImage = `url(${data.ogImage})`;
        elements.previewOgImage.textContent = '';
    } else {
        elements.previewOgImage.style.backgroundImage = '';
        elements.previewOgImage.textContent = 'No image selected';
    }
    
    // Show preview section
    elements.previewSection.style.display = 'block';
}

// File processing - FIXED VERSION
async function processFile() {
    if (!uploadedFile) {
        showStatus('Please select an HTML file first.', 'error');
        return;
    }
    
    const formData = collectFormData();
    
    // Validate required fields
    if (!formData.metaTitle || !formData.metaDescription) {
        showStatus('Please fill in the required fields (Meta Title and Meta Description).', 'error');
        return;
    }
    
    elements.processBtn.disabled = true;
    elements.processBtn.classList.add('processing');
    elements.processBtn.textContent = 'Processing...';
    
    try {
        // Use FileReader API instead of window.fs.readFile
        const fileContent = await readFileAsText(uploadedFile);
        const enhancedHtml = injectSEOMetadata(fileContent, formData);
        
        // Download the enhanced file
        downloadFile(enhancedHtml, getEnhancedFileName(uploadedFile.name));
        
        showStatus('SEO metadata successfully injected! File downloaded.', 'success');
        
    } catch (error) {
        console.error('Processing error:', error);
        showStatus('Error processing file: ' + error.message, 'error');
    } finally {
        elements.processBtn.disabled = false;
        elements.processBtn.classList.remove('processing');
        elements.processBtn.textContent = 'Process & Download Enhanced HTML';
    }
}

// FIXED: File reading using standard FileReader API
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(event) {
            resolve(event.target.result);
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
    });
}

// SEO metadata injection
function injectSEOMetadata(htmlContent, data) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    let head = doc.querySelector('head');
    if (!head) {
        head = doc.createElement('head');
        doc.documentElement.insertBefore(head, doc.body);
    }
    
    // Remove existing SEO meta tags to avoid duplicates
    removeSEOTags(head);
    
    // Inject new SEO metadata
    const seoHTML = generateSEOMetadata(data);
    const tempDiv = doc.createElement('div');
    tempDiv.innerHTML = seoHTML;
    
    // Add each element to head
    while (tempDiv.firstChild) {
        head.appendChild(tempDiv.firstChild);
    }
    
    // Update or add lang attribute
    if (data.language) {
        doc.documentElement.setAttribute('lang', data.language);
    }
    
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

// Remove existing SEO tags
function removeSEOTags(head) {
    const selectors = [
        'meta[name="description"]',
        'meta[name="keywords"]',
        'meta[name="author"]',
        'meta[name="robots"]',
        'meta[property^="og:"]',
        'meta[name^="twitter:"]',
        'link[rel="canonical"]',
        'script[type="application/ld+json"]',
        'title'
    ];
    
    selectors.forEach(selector => {
        const elements = head.querySelectorAll(selector);
        elements.forEach(el => el.remove());
    });
}

// Generate SEO metadata HTML
function generateSEOMetadata(data) {
    let html = '';
    
    // Title
    html += `    <title>${escapeHtml(data.metaTitle)}</title>\n`;
    
    // Basic meta tags
    html += `    <meta name="description" content="${escapeHtml(data.metaDescription)}">\n`;
    
    if (data.keywords) {
        html += `    <meta name="keywords" content="${escapeHtml(data.keywords)}">\n`;
    }
    
    if (data.author) {
        html += `    <meta name="author" content="${escapeHtml(data.author)}">\n`;
    }
    
    html += `    <meta name="robots" content="${data.robots || 'index, follow'}">\n`;
    
    // Canonical URL
    if (data.canonicalUrl) {
        html += `    <link rel="canonical" href="${escapeHtml(data.canonicalUrl)}">\n`;
    }
    
    // Open Graph tags
    html += `    <meta property="og:title" content="${escapeHtml(data.ogTitle || data.metaTitle)}">\n`;
    html += `    <meta property="og:description" content="${escapeHtml(data.ogDescription || data.metaDescription)}">\n`;
    html += `    <meta property="og:type" content="${data.ogType || 'website'}">\n`;
    
    if (data.ogImage) {
        html += `    <meta property="og:image" content="${escapeHtml(data.ogImage)}">\n`;
    }
    
    if (data.canonicalUrl) {
        html += `    <meta property="og:url" content="${escapeHtml(data.canonicalUrl)}">\n`;
    }
    
    // Twitter Card tags
    html += `    <meta name="twitter:card" content="${data.twitterCard || 'summary'}">\n`;
    html += `    <meta name="twitter:title" content="${escapeHtml(data.ogTitle || data.metaTitle)}">\n`;
    html += `    <meta name="twitter:description" content="${escapeHtml(data.ogDescription || data.metaDescription)}">\n`;
    
    if (data.twitterSite) {
        html += `    <meta name="twitter:site" content="${escapeHtml(data.twitterSite)}">\n`;
    }
    
    if (data.ogImage) {
        html += `    <meta name="twitter:image" content="${escapeHtml(data.ogImage)}">\n`;
    }
    
    // Structured Data (JSON-LD)
    if (data.schemaType && data.schemaType !== 'none' && data.schemaData) {
        const jsonLd = generateJSONLD(data.schemaType, data.schemaData, data);
        html += `    <script type="application/ld+json">\n${jsonLd}\n    </script>\n`;
    }
    
    return html;
}

// Generate JSON-LD structured data
function generateJSONLD(schemaType, schemaData, globalData) {
    let jsonLd = {
        "@context": "https://schema.org",
        "@type": schemaType
    };
    
    switch (schemaType) {
        case 'Article':
            jsonLd = {
                ...jsonLd,
                headline: schemaData.articleHeadline || globalData.metaTitle,
                author: {
                    "@type": "Person",
                    name: schemaData.articleAuthor
                },
                datePublished: schemaData.articleDatePublished,
                dateModified: schemaData.articleDateModified || schemaData.articleDatePublished
            };
            
            if (schemaData.articleImage) {
                jsonLd.image = schemaData.articleImage;
            }
            break;
            
        case 'Product':
            jsonLd = {
                ...jsonLd,
                name: schemaData.productName,
                brand: {
                    "@type": "Brand",
                    name: schemaData.productBrand
                },
                offers: {
                    "@type": "Offer",
                    price: schemaData.productPrice,
                    priceCurrency: schemaData.productCurrency || 'USD',
                    availability: `https://schema.org/${schemaData.productAvailability || 'InStock'}`
                }
            };
            
            if (schemaData.productRating) {
                jsonLd.aggregateRating = {
                    "@type": "AggregateRating",
                    ratingValue: schemaData.productRating,
                    ratingCount: "1"
                };
            }
            break;
            
        case 'Organization':
            jsonLd = {
                ...jsonLd,
                name: schemaData.orgName,
                url: schemaData.orgUrl,
                logo: schemaData.orgLogo,
                description: schemaData.orgDescription
            };
            break;
            
        case 'LocalBusiness':
            jsonLd = {
                ...jsonLd,
                name: schemaData.businessName,
                address: {
                    "@type": "PostalAddress",
                    streetAddress: schemaData.businessAddress
                },
                telephone: schemaData.businessPhone,
                openingHours: schemaData.businessHours
            };
            break;
            
        case 'WebSite':
            jsonLd = {
                ...jsonLd,
                name: schemaData.websiteName,
                url: schemaData.websiteUrl,
                description: schemaData.websiteDescription
            };
            break;
    }
    
    return JSON.stringify(jsonLd, null, 2);
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getEnhancedFileName(originalName) {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const ext = originalName.split('.').pop();
    return `${nameWithoutExt}_seo_enhanced.${ext}`;
}

function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function showStatus(message, type = 'info') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message ${type}`;
    elements.statusMessage.style.display = 'block';
    
    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            elements.statusMessage.style.display = 'none';
        }, 5000);
    }
}

// Initialize form data on load
currentFormData = collectFormData();