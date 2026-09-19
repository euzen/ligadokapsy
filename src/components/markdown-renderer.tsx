import { Text, View } from 'react-native';

function parseInline(text: string) {
  const parts: (string | { bold: true; text: string })[] = [];
  const regex = /\*\*(.+?)\*\*|__(.+?)__/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push({ bold: true, text: match[1] ?? match[2] });
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function MarkdownRenderer({ source }: { source: string }) {
  const lines = source.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <View key={`list-${key++}`} className="my-2 ml-2 gap-1">
        {listItems.map((item, index) => (
          <View key={index} className="flex-row gap-2">
            <Text className="text-slate-900 dark:text-white">•</Text>
            <Text className="flex-1 text-sm text-slate-900 dark:text-white">
              {parseInline(item).map((part, i) => (typeof part === 'string' ? part : <Text key={i} className="font-bold">{part.text}</Text>))}
            </Text>
          </View>
        ))}
      </View>
    );
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') { flushList(); continue; }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) { listItems.push(trimmed.slice(2)); continue; }
    flushList();
    if (trimmed.startsWith('### ')) { elements.push(<Text key={key++} className="mt-3 text-base font-black text-slate-900 dark:text-white">{trimmed.slice(4)}</Text>); continue; }
    if (trimmed.startsWith('## ')) { elements.push(<Text key={key++} className="mt-4 text-lg font-black text-slate-900 dark:text-white">{trimmed.slice(3)}</Text>); continue; }
    if (trimmed.startsWith('# ')) { elements.push(<Text key={key++} className="mt-5 text-2xl font-black text-slate-900 dark:text-white">{trimmed.slice(2)}</Text>); continue; }
    elements.push(
      <Text key={key++} className="my-1 text-sm leading-relaxed text-slate-900 dark:text-white">
        {parseInline(trimmed).map((part, i) => (typeof part === 'string' ? part : <Text key={i} className="font-bold">{part.text}</Text>))}
      </Text>
    );
  }
  flushList();
  return <View className="gap-1">{elements}</View>;
}
