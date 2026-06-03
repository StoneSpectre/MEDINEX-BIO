export interface PubMedArticle {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi?: string;
}

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

/**
 * Searches PubMed for the given query and returns a list of articles.
 */
export async function searchPubMed(query: string, maxResults: number = 5): Promise<PubMedArticle[]> {
  try {
    // 1. Search for PMIDs
    const searchUrl = `${BASE_URL}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=${maxResults}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error('Failed to fetch from PubMed Search');
    
    const searchData = await searchRes.json();
    const pmids: string[] = searchData.esearchresult?.idlist || [];
    
    if (pmids.length === 0) return [];

    // 2. Fetch summaries for the retrieved PMIDs
    const summaryUrl = `${BASE_URL}/esummary.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=json`;
    const summaryRes = await fetch(summaryUrl);
    if (!summaryRes.ok) throw new Error('Failed to fetch from PubMed Summary');
    
    const summaryData = await summaryRes.json();
    const results = summaryData.result || {};
    
    const articles: PubMedArticle[] = pmids.map(id => {
      const article = results[id];
      if (!article) return null;
      
      // Extract author names
      const authors = article.authors 
        ? article.authors.map((a: any) => a.name).join(', ')
        : 'Unknown Author';
        
      // Truncate long author lists
      const authorString = authors.length > 50 ? authors.substring(0, 50) + ' et al.' : authors;
      
      // Extract DOI if available
      const doiEl = article.articleids?.find((aid: any) => aid.idtype === 'doi');
      const doi = doiEl ? doiEl.value : undefined;
      
      return {
        id: article.uid,
        title: article.title,
        authors: authorString,
        journal: article.fulljournalname || article.source,
        year: article.pubdate ? article.pubdate.substring(0, 4) : 'Unknown',
        doi,
      };
    }).filter(Boolean) as PubMedArticle[];

    return articles;
  } catch (error) {
    console.error("PubMed Search Error:", error);
    return [];
  }
}
