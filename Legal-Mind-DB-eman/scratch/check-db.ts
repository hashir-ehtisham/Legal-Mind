import { getServiceSupabaseClient } from "../lib/supabase";

const supabase = getServiceSupabaseClient();

async function main() {
    console.log("Checking DB status...");

    const { data: docs, error: docsError } = await supabase
        .from("legal_documents")
        .select("id, title, law_category");

    if (docsError) {
        console.error("Error fetching documents:", docsError.message);
        return;
    }

    console.log(`Found ${docs?.length || 0} documents:`);
    for (const doc of docs || []) {
        const { count, error: countError } = await supabase
            .from("legal_chunks")
            .select("id", { count: "exact", head: true })
            .eq("document_id", doc.id);

        if (countError) {
            console.error(`Error counting chunks for ${doc.title}:`, countError.message);
        } else {
            console.log(`- "${doc.title}" (${doc.law_category}): ${count} chunks`);
        }
    }

    const { count: totalChunks, error: totalError } = await supabase
        .from("legal_chunks")
        .select("id", { count: "exact", head: true });

    if (totalError) {
        console.error("Error counting total chunks:", totalError.message);
    } else {
        console.log(`Total chunks in DB: ${totalChunks}`);
    }
}

main();
