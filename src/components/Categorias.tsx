import React, { useState, useRef, useMemo } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { CategoryType, DREGroup, CostCenter } from '../types';
import { useFinancialStore } from '../lib/store';
import { useAuth } from '../lib/auth';

const Categorias: React.FC = () => {
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showCostCenterForm, setShowCostCenterForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryType | null>(null);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [newCategory, setNewCategory] = useState<Partial<CategoryType>>({
    type: 'income'
  });
  const [newCostCenter, setNewCostCenter] = useState<Partial<CostCenter>>({
    active: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [activeTab, setActiveTab] = useState<'categories' | 'cost-centers'>('categories');
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { 
    categoryTypes, 
    costCenters,
    addCategoryType, 
    updateCategoryType, 
    deleteCategoryType,
    addCostCenter,
    updateCostCenter,
    deleteCostCenter
  } = useFinancialStore();

  // DRE Groups configuration
  const dreGroups = [
    { id: 'receita_bruta', name: 'Receita Bruta de Vendas', type: 'income', order: 1 },
    { id: 'impostos', name: 'Impostos', type: 'expense', order: 2 },
    { id: 'deducao_receita', name: 'Deduções de Receitas', type: 'expense', order: 3 },
    { id: 'custos_cmv', name: 'Custos das Mercadorias Vendidas (CMV)', type: 'expense', order: 4 },
    { id: 'custos_cpv', name: 'Custos dos Produtos Vendidos (CPV)', type: 'expense', order: 5 },
    { id: 'custos_servicos', name: 'Custos dos Serviços Prestados', type: 'expense', order: 6 },
    { id: 'despesas_administrativas', name: 'Despesas Administrativas', type: 'expense', order: 7 },
    { id: 'despesas_pessoal', name: 'Despesas com Pessoal', type: 'expense', order: 8 },
    { id: 'despesas_variaveis', name: 'Despesas Variáveis', type: 'expense', order: 9 },
    { id: 'outras_receitas', name: 'Outras Receitas', type: 'income', order: 10 },
    { id: 'receitas_financeiras', name: 'Receitas Financeiras', type: 'income', order: 11 },
    { id: 'despesas_financeiras', name: 'Despesas Financeiras', type: 'expense', order: 12 },
    { id: 'investimentos', name: 'Investimentos', type: 'expense', order: 13 }
  ];

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!newCategory.name || !newCategory.type || !newCategory.dreGroup) {
        throw new Error('Nome, tipo e grupo DRE são obrigatórios');
      }

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      if (editingCategory) {
        await updateCategoryType(editingCategory.name, newCategory.name);
      } else {
        await addCategoryType({
          ...newCategory as CategoryType,
          userId: user.id
        });
      }
      setShowCategoryForm(false);
      setEditingCategory(null);
      setNewCategory({ type: 'income' });
    } catch (error) {
      console.error('Error saving category:', error);
      setError(error instanceof Error ? error.message : 'Erro ao salvar categoria');
    }
  };

  const handleSubmitCostCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!newCostCenter.name) {
        throw new Error('Nome é obrigatório');
      }

      if (editingCostCenter) {
        await updateCostCenter(editingCostCenter.id, newCostCenter);
      } else {
        await addCostCenter(newCostCenter as CostCenter);
      }
      setShowCostCenterForm(false);
      setEditingCostCenter(null);
      setNewCostCenter({ active: true });
    } catch (error) {
      console.error('Error saving cost center:', error);
      setError(error instanceof Error ? error.message : 'Erro ao salvar centro de custo');
    }
  };

  const handleEditCategory = (category: CategoryType) => {
    setEditingCategory(category);
    setNewCategory(category);
    setShowCategoryForm(true);
  };

  const handleEditCostCenter = (costCenter: CostCenter) => {
    setEditingCostCenter(costCenter);
    setNewCostCenter(costCenter);
    setShowCostCenterForm(true);
  };

  const handleDeleteCategory = async (name: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      try {
        await deleteCategoryType(name);
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Erro ao excluir categoria. Por favor, tente novamente.');
      }
    }
  };

  const handleDeleteCostCenter = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este centro de custo?')) {
      try {
        await deleteCostCenter(id);
      } catch (error) {
        console.error('Error deleting cost center:', error);
        alert('Erro ao excluir centro de custo. Por favor, tente novamente.');
      }
    }
  };

  // Filter categories based on search and type
  const filteredCategories = categoryTypes.filter(category => {
    const matchesSearch = !searchTerm || 
      category.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || category.type === filterType;
    return matchesSearch && matchesType;
  });

  // Filter cost centers based on search
  const filteredCostCenters = costCenters.filter(costCenter => {
    const matchesSearch = !searchTerm || 
      costCenter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      costCenter.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Group categories by DRE group
  const groupedCategories = filteredCategories.reduce((acc, category) => {
    const dreGroup = dreGroups.find(g => g.id === category.dreGroup);
    if (!acc[category.dreGroup]) {
      acc[category.dreGroup] = {
        name: dreGroup?.name || category.dreGroup,
        type: dreGroup?.type || category.type,
        categories: []
      };
    }
    acc[category.dreGroup].categories.push(category);
    return acc;
  }, {} as Record<string, { name: string; type: string; categories: CategoryType[] }>);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Plano de Contas</h1>
          <p className="text-gray-500 mt-1">Gerencie suas categorias e centros de custo</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'categories' && (
            <button
              onClick={() => {
                setShowCategoryForm(true);
                setEditingCategory(null);
                setNewCategory({ type: 'income' });
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </button>
          )}
          {activeTab === 'cost-centers' && (
            <button
              onClick={() => {
                setShowCostCenterForm(true);
                setEditingCostCenter(null);
                setNewCostCenter({ active: true });
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Centro de Custo
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('categories')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'categories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Categorias
            </button>
            <button
              onClick={() => setActiveTab('cost-centers')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'cost-centers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Centros de Custo
            </button>
          </nav>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={
              activeTab === 'categories'
                ? "Pesquisar categorias..."
                : "Pesquisar centros de custo..."
            }
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {activeTab === 'categories' && (
          <select
            className="px-4 py-2 border rounded-lg"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
          >
            <option value="all">Todos os Tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
        )}
      </div>

      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
        {activeTab === 'categories' ? (
          <div className="p-6 space-y-6">
            {dreGroups
              .filter(group => filterType === 'all' || group.type === filterType)
              .map(group => {
                const groupData = groupedCategories[group.id];
                if (!groupData?.categories.length) return null;

                return (
                  <div key={group.id} className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      {group.name}
                    </h3>
                    <div className="space-y-2">
                      {groupData.categories.map(category => (
                        <div
                          key={category.name}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div>
                            <p className="font-medium text-gray-800">{category.name}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              category.type === 'income' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {category.type === 'income' ? 'Receita' : 'Despesa'}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar categoria"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.name)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir categoria"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="p-6">
            <div className="space-y-4">
              {filteredCostCenters.map(costCenter => (
                <div
                  key={costCenter.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <h3 className="font-medium text-gray-800">{costCenter.name}</h3>
                    {costCenter.description && (
                      <p className="text-sm text-gray-500">{costCenter.description}</p>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      costCenter.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {costCenter.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditCostCenter(costCenter)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar centro de custo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCostCenter(costCenter.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir centro de custo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input
                  type="text"
                  value={newCategory.name || ''}
                  onChange={(e) => setNewCategory({
                    ...newCategory,
                    name: e.target.value
                  })}
                  className="w-full border rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={newCategory.type || 'income'}
                  onChange={(e) => setNewCategory({
                    ...newCategory,
                    type: e.target.value as 'income' | 'expense',
                    dreGroup: undefined // Clear DRE group when type changes
                  })}
                  className="w-full border rounded-lg p-2"
                  required
                  disabled={!!editingCategory}
                >
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Grupo DRE</label>
                <select
                  value={newCategory.dreGroup || ''}
                  onChange={(e) => setNewCategory({
                    ...newCategory,
                    dreGroup: e.target.value as DREGroup
                  })}
                  className="w-full border rounded-lg p-2"
                  required
                >
                  <option value="">Selecione um grupo</option>
                  {dreGroups
                    .filter(group => group.type === newCategory.type)
                    .map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryForm(false);
                    setEditingCategory(null);
                    setNewCategory({ type: 'income' });
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
                  {editingCategory ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cost Center Form Modal */}
      {showCostCenterForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingCostCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCostCenter} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input
                  type="text"
                  value={newCostCenter.name || ''}
                  onChange={(e) => setNewCostCenter({
                    ...newCostCenter,
                    name: e.target.value
                  })}
                  className="w-full border rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <textarea
                  value={newCostCenter.description || ''}
                  onChange={(e) => setNewCostCenter({
                    ...newCostCenter,
                    description: e.target.value
                  })}
                  className="w-full border rounded-lg p-2"
                  rows={3}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={newCostCenter.active}
                  onChange={(e) => setNewCostCenter({
                    ...newCostCenter,
                    active: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                  Ativo
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCostCenterForm(false);
                    setEditingCostCenter(null);
                    setNewCostCenter({ active: true });
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
                  {editingCostCenter ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categorias;