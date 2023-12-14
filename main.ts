import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts'
import { load } from "https://deno.land/std@0.209.0/dotenv/mod.ts";
import { logger } from 'npm:hono/logger'
import { basicAuth } from 'npm:hono/basic-auth'


type Project = {
    name: string
    description?: string
    url?: string
    repo: string
    tags?: string[]
}


const env = await load();



const kv = await Deno.openKv()

const app = new Hono()

//@ts-ignore the types are wrong
app.use('*', logger())


//@ts-ignore the types are wrong
app.use(
    '*',
    basicAuth({
        username: Deno.env.get('USERNAME') || env['USERNAME'],
        password: Deno.env.get('PASSWORD') || env['PASSWORD'],
    })
)

app.get('/', (c) => c.text('Hello from my cms!'))

app.get('/projects', async (c) => {
    const projects: Project[] = []
    const res = kv.list({ prefix: ['projects'] })

    for await (const { value } of res) {
        const project = value as Project
        projects.push(project)
    }

    return c.json(projects)
})
app.post('/projects', async (c) => {
    const body = await c.req.json()
    const project = body as Project

    if (!body) {
        return c.status(400)

    }

    if (project.repo === undefined || project.name === undefined || project.repo === '') {
        return c.status(400)

    }

    const key = ['projects', project.name]
    kv.set(key, project)

    return c.json(project)
})

app.get('/projects/:name', async (c) => {
    const name = c.req.param('name')
    const key = ['projects', name]
    const project = await kv.get(key)
    if (!project.value) {
        return c.notFound()
    }
    return c.json(project)
}
)


app.delete('/projects/:name', async (c) => {
    const name = c.req.param('name')
    const key = ['projects', name]
    const project = await kv.get(key)
    if (!project.value) {
        return c.notFound()
    }
    await kv.delete(key)
    return c.json(project)
}
)

app.patch('/projects/:name', async (c) => {
    const name = c.req.param('name')
    const key = ['projects', name]
    const project = await kv.get(key)
    if (!project.value) {
        return c.notFound()
    }
    const body = await c.req.json()
    const newProject = { ...project.value, ...body }
    await kv.set(key, newProject)
    return c.json(newProject)
})




Deno.serve(app.fetch)
