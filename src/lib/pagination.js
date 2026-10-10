// Seek by a unique primary key. Continue until an empty page, even if the API
// applies a lower row cap than requested. Never publish a partial accumulation.
export async function readAll(client, table, columns, key) {
  const rows=[]; let cursor=0
  for(let page=0;page<10000;page++) {
    const {data,error}=await client.from(table).select(columns).order(key).gt(key,cursor).limit(500)
    if(error) throw error
    if(!Array.isArray(data)) throw new Error(`${table} returned incomplete data`)
    if(!data.length)return rows
    for(const row of data) {
      const id=Number(row[key])
      if(!Number.isSafeInteger(id) || id<=cursor)throw new Error(`${table} pagination did not advance`)
      rows.push(row);cursor=id
    }
  }
  throw new Error(`${table} exceeded the pagination safety limit`)
}
