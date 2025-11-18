import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import AppHeader from './AppHeader';
import PageHeader from './PageHeader';
import Breadcrumbs from './Breadcrumbs';
import { ApiService } from '../services/api';

// Import instrument images
import Cello1 from '../assets/cello-1.png';
import ViolaImg from '../assets/Viola.png';
import ViolinImg from '../assets/violin.png';

// Icon components for each instrument
function ViolinIcon() {
  return (
    <img src={ViolinImg} alt="Violin" className="w-full h-full object-contain" />
  );
}

function ViolaIcon() {
  return (
    <img src={ViolaImg} alt="Viola" className="w-full h-full object-contain" />
  );
}

function CelloIcon() {
  return (
    <img src={Cello1} alt="Cello" className="w-full h-full object-contain" />
  );
}

// Placeholder icon for instruments without images
function PlaceholderIcon({ instrument }: { instrument: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[rgba(231,109,87,0.1)] to-[rgba(231,109,87,0.05)] rounded-lg">
      <span className="text-4xl font-bold text-[#e76d57] opacity-50">
        {instrument.charAt(0)}
      </span>
    </div>
  );
}

function InstrumentCard({ 
  icon,
  name,
  range,
  description,
  isSelected,
  onClick 
}: { 
  icon: React.ReactNode;
  name: string;
  range: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div 
      className={`bg-gradient-to-b box-border content-stretch flex from-[rgba(231,109,87,0.1)] flex-col gap-[14px] sm:gap-[16px] md:gap-[18px] items-center p-[20px] sm:p-[24px] md:p-[28px] lg:p-[32px] relative rounded-[20px] sm:rounded-[24px] md:rounded-[28px] shrink-0 to-[109.2%] to-[rgba(115,115,115,0)] w-full cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl ${isSelected ? 'ring-4 ring-[#e76d57] shadow-2xl' : ''}`}
      onClick={onClick}
    >
      <div aria-hidden="true" className={`absolute border-[2px] sm:border-[2.5px] md:border-[3px] border-solid inset-0 pointer-events-none rounded-[20px] sm:rounded-[24px] md:rounded-[28px] transition-colors ${isSelected ? 'border-[#e76d57]' : 'border-[#e5ddd5]'}`} />
      
      <div className="relative shrink-0 w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] md:w-[160px] md:h-[160px] flex items-center justify-center">
        {icon}
      </div>
      
      <p className="font-['Figtree:Bold',_sans-serif] font-bold leading-[normal] relative shrink-0 text-[18px] sm:text-[20px] md:text-[22px] text-black text-center">
        {name}
      </p>
      
      <div className="flex flex-col gap-1 items-center text-center">
        <p className="font-['SF_Pro_Rounded:Regular',_sans-serif] text-[#6B6563] text-[12px] sm:text-[13px] md:text-[14px]">
          Range: {range}
        </p>
        <p className="font-['SF_Pro_Rounded:Regular',_sans-serif] text-[#6B6563] text-[11px] sm:text-[12px] md:text-[13px] px-2">
          {description}
        </p>
      </div>
    </div>
  );
}

function Frame9({ selectedInstruments, onInstrumentToggle, maxSelection }: { selectedInstruments: string[]; onInstrumentToggle: (name: string) => void; maxSelection: number }) {
  const instrumentCategories = [
    {
      category: 'Strings',
      instruments: [
        {
          icon: <ViolinIcon />,
          name: 'Violin',
          range: 'G3 to E7',
          description: 'Brilliant, agile soprano voice of the string family'
        },
        {
          icon: <ViolaIcon />,
          name: 'Viola',
          range: 'C3 to E6',
          description: 'Rich alto voice with warm, mellow timbre'
        },
        {
          icon: <CelloIcon />,
          name: 'Cello',
          range: 'C2 to A5',
          description: 'Deep, rich tones with warm character'
        },
      ]
    },
    {
      category: 'Woodwinds',
      instruments: [
        {
          icon: <PlaceholderIcon instrument="Flute" />,
          name: 'Flute',
          range: 'C4 to C7',
          description: 'Bright, clear tone with excellent agility'
        },
        {
          icon: <PlaceholderIcon instrument="Oboe" />,
          name: 'Oboe',
          range: 'Bb3 to A6',
          description: 'Penetrating, reedy sound with expressive quality'
        },
        {
          icon: <PlaceholderIcon instrument="Clarinet" />,
          name: 'B-flat Clarinet',
          range: 'D3 to Bb6',
          description: 'Versatile with wide dynamic range'
        },
        {
          icon: <PlaceholderIcon instrument="Bassoon" />,
          name: 'Bassoon',
          range: 'Bb1 to Eb5',
          description: 'Deep, reedy bass voice of the woodwinds'
        },
      ]
    },
    {
      category: 'Brass',
      instruments: [
        {
          icon: <PlaceholderIcon instrument="Trumpet" />,
          name: 'B-flat Trumpet',
          range: 'E3 to Bb5',
          description: 'Brilliant, penetrating tone with power'
        },
        {
          icon: <PlaceholderIcon instrument="Horn" />,
          name: 'F Horn',
          range: 'B2 to F5',
          description: 'Noble, mellow tone with rich harmonics'
        },
        {
          icon: <PlaceholderIcon instrument="Tuba" />,
          name: 'Tuba',
          range: 'D1 to F4',
          description: 'Deep, powerful bass foundation'
        },
      ]
    },
    {
      category: 'Voices',
      instruments: [
        {
          icon: <PlaceholderIcon instrument="Soprano" />,
          name: 'Soprano',
          range: 'C4 to C6',
          description: 'Highest female voice with clear, bright tone'
        },
        {
          icon: <PlaceholderIcon instrument="Tenor" />,
          name: 'Tenor Voice',
          range: 'C3 to C5',
          description: 'Highest male voice with bright character'
        },
      ]
    }
  ];

  return (
    <div className="content-start flex flex-col gap-[40px] sm:gap-[48px] md:gap-[56px] items-start relative shrink-0 w-full">
      {instrumentCategories.map((category, categoryIndex) => (
        <div key={categoryIndex} className="w-full">
          <h3 className="font-['Figtree:Bold',_sans-serif] font-bold text-[20px] sm:text-[22px] md:text-[24px] text-[#201315] mb-[20px] sm:mb-[24px]">
            {category.category}
          </h3>
          <div className="flex flex-wrap gap-[16px] sm:gap-[20px] md:gap-[24px]">
            {category.instruments.map((instrument, i) => {
              const isSelected = selectedInstruments.includes(instrument.name);
              const canSelect = isSelected || selectedInstruments.length < maxSelection;

              return (
                <div key={i} className={`w-[calc(50%-8px)] sm:w-[calc(33.33%-14px)] md:w-[240px] lg:w-[260px] ${!canSelect ? 'opacity-40 pointer-events-none' : ''}`}>
                  <InstrumentCard
                    icon={instrument.icon}
                    name={instrument.name}
                    range={instrument.range}
                    description={instrument.description}
                    isSelected={isSelected}
                    onClick={() => canSelect && onInstrumentToggle(instrument.name)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Frame13({
  selectedInstruments,
  onInstrumentToggle,
  onGenerate,
  isGenerating,
  error
}: {
  selectedInstruments: string[];
  onInstrumentToggle: (name: string) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
  error?: string | null;
}) {
  const canContinue = selectedInstruments.length > 0 && !isGenerating;

  return (
    <div className="content-stretch flex flex-col gap-[40px] md:gap-[60px] items-start w-full">
      <Frame9 selectedInstruments={selectedInstruments} onInstrumentToggle={onInstrumentToggle} maxSelection={4} />

      {error && (
        <div className="self-center w-full max-w-[400px] p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-center">
          {error}
        </div>
      )}

      <Button
        onClick={onGenerate}
        className="self-center min-w-[200px] h-12 text-base bg-gradient-to-r from-[#201315] to-[#e76d57] hover:opacity-90"
        disabled={!canContinue}
      >
        {isGenerating ? 'Generating...' : 'Continue'}
      </Button>
    </div>
  );
}

function ToastNotification({ count, maxSelection, onDismiss }: { count: number; maxSelection: number; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-8 right-8 bg-white rounded-2xl shadow-2xl border-2 border-[#e5ddd5] p-6 flex items-center gap-4 animate-in slide-in-from-bottom-4 z-50">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-[#e76d57]" />
        <p className="font-['Figtree:SemiBold',_sans-serif] text-[#201315] text-[16px]">
          {count} of {maxSelection} instruments selected
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="ml-2 p-1 hover:bg-[#f8f3eb] rounded-lg transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={20} className="text-[#813D31]" />
      </button>
    </div>
  );
}

export default function InstrumentSelectionScreen({
  onGenerate,
  uploadedFile
}: {
  onGenerate: (data: any) => void;
  uploadedFile: File | null;
}) {
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedInstruments.length > 0 && selectedInstruments.length <= 4) {
      setShowToast(true);
    } else {
      setShowToast(false);
    }
  }, [selectedInstruments]);

  const handleInstrumentToggle = (name: string) => {
    setSelectedInstruments(prev =>
      prev.includes(name)
        ? prev.filter(i => i !== name)
        : prev.length < 4 ? [...prev, name] : prev
    );
  };

  const handleGenerate = async () => {
    if (!uploadedFile) {
      setError('No file uploaded');
      return;
    }

    if (selectedInstruments.length === 0) {
      setError('Please select at least one instrument');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Call real backend API
      const result = await ApiService.harmonize({
        file: uploadedFile,
        instruments: selectedInstruments
      });

      console.log('[Frontend] Harmonization successful:', result.metadata);

      onGenerate({
        ...result,
        instruments: selectedInstruments
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate harmony';
      console.error('[Frontend] Harmonization error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-[#f8f3eb] relative w-full h-screen overflow-hidden flex flex-col">
      <AppHeader
        currentStep={0}
        totalSteps={3}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-4">
          <Breadcrumbs
            steps={["Select Instruments", "Processing", "Results"]}
            currentStep={0}
          />
          <PageHeader
            title="Choose your instruments"
            subtitle="Select up to 4 instruments for your chamber ensemble"
          />
          <Frame13
            selectedInstruments={selectedInstruments}
            onInstrumentToggle={handleInstrumentToggle}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            error={error}
          />
        </div>
      </div>
      {showToast && (
        <ToastNotification
          count={selectedInstruments.length}
          maxSelection={4}
          onDismiss={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
