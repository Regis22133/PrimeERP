import React, { useState, useRef } from 'react';
import { Plus, Search, Filter, Mail, Phone, Building2, Edit2, Trash2, AlertCircle, Upload, Download } from 'lucide-react';
import { Contact } from '../types';
import { useFinancialStore } from '../lib/store';
import * as XLSX from 'xlsx';

const Contatos: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'client' | 'supplier'>('all');
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    type: 'client'
  });
  const [error, setError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { contacts, addContact, updateContact, deleteContact } = useFinancialStore();

  // Format CPF/CNPJ based on length
  const formatDocument = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    if (digits.length <= 11) {
      // CPF format: 000.000.000-00
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // CNPJ format: 00.000.000/0000-00
      return digits
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
  };

  // Format phone number with DDD
  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Format based on length
    if (digits.length <= 11) {
      return digits
        .replace(/^(\d{2})(\d)/, '($1) $2') // DDD in parentheses
        .replace(/(\d{4,5})(\d{4})$/, '$1-$2'); // Separate last 4 digits
    }
    return digits;
  };

  // Validate CPF/CNPJ
  const validateDocument = (document: string) => {
    const digits = document.replace(/\D/g, '');
    if (digits.length !== 11 && digits.length !== 14) {
      return 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!newContact.name || !newContact.type || !newContact.document) {
        throw new Error('Nome, tipo e CPF/CNPJ são obrigatórios');
      }

      const documentError = validateDocument(newContact.document);
      if (documentError) {
        throw new Error(documentError);
      }

      if (editingContact) {
        await updateContact(editingContact.id, newContact);
      } else {
        await addContact(newContact);
      }

      setShowForm(false);
      setEditingContact(null);
      setNewContact({ type: 'client' });
    } catch (error) {
      console.error('Error saving contact:', error);
      setError(error instanceof Error ? error.message : 'Erro ao salvar contato');
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setNewContact(contact);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este contato?')) {
      try {
        await deleteContact(id);
      } catch (error) {
        console.error('Error deleting contact:', error);
        alert('Erro ao excluir contato. Por favor, tente novamente.');
      }
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportError(null);

      // Read Excel file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Validate headers
          const expectedHeaders = ['Nome', 'Tipo', 'CPF/CNPJ', 'Email', 'Telefone'];
          const headers = rows[0] as string[];
          const missingHeaders = expectedHeaders.filter(header => !headers.includes(header));

          if (missingHeaders.length > 0) {
            throw new Error(`Cabeçalhos ausentes: ${missingHeaders.join(', ')}`);
          }

          // Process rows
          const contacts = rows.slice(1).map((row: any, index) => {
            const [name, type, document, email, phone] = row;

            // Validate required fields
            if (!name || !type || !document) {
              throw new Error(`Linha ${index + 2}: Nome, tipo e CPF/CNPJ são obrigatórios`);
            }

            // Validate type
            if (type !== 'client' && type !== 'supplier') {
              throw new Error(`Linha ${index + 2}: Tipo deve ser 'client' ou 'supplier'`);
            }

            // Validate document
            const documentError = validateDocument(document?.toString() || '');
            if (documentError) {
              throw new Error(`Linha ${index + 2}: ${documentError}`);
            }

            return {
              name,
              type,
              document: formatDocument(document?.toString() || ''),
              email: email || undefined,
              phone: phone ? formatPhone(phone.toString()) : undefined
            };
          });

          // Add all contacts
          await Promise.all(contacts.map(contact => addContact(contact)));

          alert('Importação concluída com sucesso!');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (error) {
          console.error('Error processing Excel file:', error);
          setImportError(error instanceof Error ? error.message : 'Erro ao processar arquivo');
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error importing contacts:', error);
      setImportError(error instanceof Error ? error.message : 'Erro ao importar contatos');
    }
  };

  const handleExport = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create worksheet data
    const wsData = [
      ['Nome', 'Tipo', 'CPF/CNPJ', 'Email', 'Telefone']
    ];

    // Add contacts
    contacts.forEach(contact => {
      wsData.push([
        contact.name,
        contact.type,
        contact.document || '',
        contact.email || '',
        contact.phone || ''
      ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // Nome
      { wch: 15 }, // Tipo
      { wch: 20 }, // CPF/CNPJ
      { wch: 30 }, // Email
      { wch: 20 }  // Telefone
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Contatos');

    // Generate file
    const wbout = XLSX.write(wb, { 
      bookType: 'xlsx', 
      type: 'array'
    });

    // Create blob and download
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contatos_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter contacts based on search and type
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchTerm || 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.document?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || contact.type === filterType;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Contatos</h1>
          <p className="text-gray-500 mt-1">Gerencie seus clientes e fornecedores</p>
        </div>
        <div className="flex gap-2">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 transition-colors"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <div className="flex flex-col gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".xlsx,.xls"
              className="hidden"
            />
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </button>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingContact(null);
              setNewContact({ type: 'client' });
              setError(null);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Contato
          </button>
        </div>
      </div>

      {importError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium">Erro na importação</h3>
              <pre className="text-red-600 mt-1 text-sm whitespace-pre-wrap">
                {importError}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Pesquisar contatos..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border rounded-lg"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as 'all' | 'client' | 'supplier')}
        >
          <option value="all">Todos</option>
          <option value="client">Clientes</option>
          <option value="supplier">Fornecedores</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.map(contact => (
          <div key={contact.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{contact.name}</h3>
                <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                  contact.type === 'client'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {contact.type === 'client' ? 'Cliente' : 'Fornecedor'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(contact)}
                  className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                  title="Editar contato"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(contact.id)}
                  className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                  title="Excluir contato"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {contact.document && (
              <div className="flex items-center text-gray-600 mb-2">
                <Building2 className="w-4 h-4 mr-2" />
                <span className="text-sm">{contact.document}</span>
              </div>
            )}
            
            {contact.email && (
              <div className="flex items-center text-gray-600 mb-2">
                <Mail className="w-4 h-4 mr-2" />
                <a 
                  href={`mailto:${contact.email}`}
                  className="text-sm hover:text-blue-600 transition-colors"
                >
                  {contact.email}
                </a>
              </div>
            )}
            
            {contact.phone && (
              <div className="flex items-center text-gray-600">
                <Phone className="w-4 h-4 mr-2" />
                <a 
                  href={`tel:${contact.phone}`}
                  className="text-sm hover:text-blue-600 transition-colors"
                >
                  {contact.phone}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingContact ? 'Editar Contato' : 'Novo Contato'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input
                  type="text"
                  value={newContact.name || ''}
                  onChange={(e) => setNewContact({
                    ...newContact,
                    name: e.target.value
                  })}
                  className="w-full border rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={newContact.type || 'client'}
                  onChange={(e) => setNewContact({
                    ...newContact,
                    type: e.target.value as 'client' | 'supplier'
                  })}
                  className="w-full border rounded-lg p-2"
                  required
                >
                  <option value="client">Cliente</option>
                  <option value="supplier">Fornecedor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  CPF/CNPJ
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={newContact.document || ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, '');
                    if (rawValue.length <= 14) { // Limit to CNPJ length
                      setNewContact({
                        ...newContact,
                        document: formatDocument(rawValue)
                      });
                    }
                  }}
                  className="w-full border rounded-lg p-2"
                  required
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Digite apenas números - a formatação é automática
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newContact.email || ''}
                  onChange={(e) => setNewContact({
                    ...newContact,
                    email: e.target.value
                  })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Telefone</label>
                <input
                  type="tel"
                  value={newContact.phone || ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, '');
                    if (rawValue.length <= 11) { // Limit to mobile number length
                      setNewContact({
                        ...newContact,
                        phone: formatPhone(rawValue)
                      });
                    }
                  }}
                  className="w-full border rounded-lg p-2"
                  placeholder="(00) 00000-0000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Digite apenas números - a formatação é automática
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingContact(null);
                    setNewContact({ type: 'client' });
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingContact ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contatos;