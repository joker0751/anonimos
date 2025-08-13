export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { texto, autor } = req.body;
        console.log(`[${autor}] ${texto}`);
        res.status(200).json({ ok: true, recebido: true });
    } else {
        res.status(405).json({ error: "Método não permitido" });
    }
}
