import { useState, useEffect } from 'react';
import { Plus, Play, Pencil, Trash2 } from 'lucide-react';
import { Button, Card, LoadingSpinner, ProgressBar } from '../components/common';
import { Country, CollectionJob } from '../types';
import { supabase } from '../services/supabase';
import { collectBannersFromUrl } from '../services/collection';
import { DatabaseSetupGuide } from '../components/DatabaseSetupGuide';


export function CollectionPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [jobs, setJobs] = useState<Map<string, CollectionJob>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', url: '' });
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  useEffect(() => {
    loadCountries();
  }, []);

  async function loadCountries() {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Load error:', error);
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          setShowSetupGuide(true);
        } else {
          alert(`데이터 로드 실패: ${error.message}`);
        }
        throw error;
      }
      setCountries(data || []);
    } catch (err) {
      console.error('Failed to load countries:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!formData.name.trim() || !formData.url.trim()) {
      alert('국가명과 URL을 모두 입력해주세요.');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('countries')
          .update({ name: formData.name, url: formData.url })
          .eq('id', editingId);

        if (error) {
          console.error('Update error:', error);
          alert(`업데이트 실패: ${error.message}`);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('countries')
          .insert([{ name: formData.name, url: formData.url }]);

        if (error) {
          console.error('Insert error:', error);
          if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
            setShowSetupGuide(true);
          } else {
            alert(`등록 실패: ${error.message}`);
          }
          throw error;
        }
      }

      setFormData({ name: '', url: '' });
      setShowAddForm(false);
      setEditingId(null);
      await loadCountries();
    } catch (err) {
      console.error('Failed to save country:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this country?')) return;

    try {
      const { error } = await supabase
        .from('countries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadCountries();
    } catch (err) {
      console.error('Failed to delete country:', err);
    }
  }

  function handleEdit(country: Country) {
    setEditingId(country.id);
    setFormData({ name: country.name, url: country.url });
    setShowAddForm(true);
  }

  function handleCancel() {
    setFormData({ name: '', url: '' });
    setShowAddForm(false);
    setEditingId(null);
  }

  async function handleCollect(countryId: string) {
    const country = countries.find(c => c.id === countryId);
    if (!country) return;

    const job: CollectionJob = {
      country_id: countryId,
      status: 'idle',
      progress: 0,
      current_step: 'Starting collection...',
      logs: [],
    };

    setJobs(new Map(jobs.set(countryId, job)));

    try {
      await collectBannersFromUrl(country.url, (progress) => {
        const updatedJob: CollectionJob = {
          ...job,
          status: progress.status,
          progress: progress.progress,
          current_step: progress.message,
        };
        setJobs(new Map(jobs.set(countryId, updatedJob)));
      }, country.name);

      const completedJob: CollectionJob = {
        ...job,
        status: 'completed',
        progress: 100,
        current_step: 'Collection completed successfully',
      };
      setJobs(new Map(jobs.set(countryId, completedJob)));

      setTimeout(() => {
        const newJobs = new Map(jobs);
        newJobs.delete(countryId);
        setJobs(newJobs);
      }, 3000);

    } catch (error) {
      console.error('Collection failed:', error);
      const failedJob: CollectionJob = {
        ...job,
        status: 'failed',
        progress: 0,
        current_step: 'Collection failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
      };
      setJobs(new Map(jobs.set(countryId, failedJob)));

      setTimeout(() => {
        const newJobs = new Map(jobs);
        newJobs.delete(countryId);
        setJobs(newJobs);
      }, 5000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DatabaseSetupGuide isOpen={showSetupGuide} onClose={() => setShowSetupGuide(false)} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light tracking-tight">Collection</h1>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          variant={showAddForm ? 'secondary' : 'primary'}
        >
          <Plus className="w-4 h-4" />
          Add Country
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900"
                placeholder="e.g. Korea"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900"
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} variant="primary">
                {editingId ? 'Update' : 'Add'}
              </Button>
              <Button onClick={handleCancel} variant="secondary">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {countries.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500">No countries added yet</p>
          </Card>
        ) : (
          countries.map((country) => {
            const job = jobs.get(country.id);
            const isCollecting = job && job.status !== 'completed' && job.status !== 'failed';

            return (
              <Card key={country.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium truncate">{country.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{country.url}</p>

                    {job && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{job.current_step}</span>
                          <span className="text-gray-500">{Math.round(job.progress)}%</span>
                        </div>
                        <ProgressBar progress={job.progress} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      onClick={() => handleCollect(country.id)}
                      disabled={isCollecting}
                      variant="primary"
                      size="sm"
                    >
                      <Play className="w-4 h-4" />
                      {isCollecting ? 'Collecting...' : 'Collect'}
                    </Button>
                    <Button
                      onClick={() => handleEdit(country)}
                      disabled={isCollecting}
                      variant="secondary"
                      size="sm"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(country.id)}
                      disabled={isCollecting}
                      variant="secondary"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
