const path = require('path');
require('dotenv').config({
	override: true,
	path: path.join(__dirname, '.env')
});
const { Pool } = require('pg');

const pool = new Pool({
	database: process.env.DB_NAME,
	host: process.env.DB_HOST,
	password: process.env.DB_PASSWORD,
	port: process.env.DB_PORT,
	user: process.env.DB_USER,
});

const queryDatabase = async () => {
	try {
		const { rows } = await pool.query('SELECT * FROM public.woonplaats');
		console.log(rows);
	} catch (error) {
		console.error('Error querying database:', error);
	} finally {
		await pool.end();
	}
};

queryDatabase();
