# Regional latency source notes

Research completed 2026-11-12. This supports a hypothetical Virginia user → California API → Oregon database projection; it does not measure or deploy that topology. Application hosting remains a separate decision under [document 20](../20-persistent-api-transition-proposal.md#5-ordered-migration-and-release-gates). The current local diagnostic timings and their limits are recorded in the [secondary authorization investigation](secondary-auth-investigation.md).

## Region identities and routing

- Railway currently lists **US West Metal, California, `us-west2`** and US East Metal, Virginia, `us-east4-eqdc4a`. The California label is adequate for this approximation; the cited region table does not identify its California metro. These are Railway identifiers, not evidence that the service runs in a similarly named Google Cloud region. [Railway regions](https://docs.railway.com/deployments/regions)
- Supabase lists **West US (Oregon), AWS `us-west-2`**, and North California as `us-west-1`. This verifies the provider's region mapping, not the selected project's current configuration. [Supabase regions](https://supabase.com/docs/guides/platform/regions)
- Railway says public requests enter a nearby edge point and route internally to a deployed origin; a single-region application still routes to that one region. Consequently, browser-to-origin time includes the edge/origin path. A fast connection to an edge alone does not establish fast California application responses. [Railway edge networking](https://docs.railway.com/networking/edge-networking)

## Measured geographic proxies

**Microsoft Azure:** its published dataset covers the 30 days ending July 30, 2026. Internal backbone probes produce median round-trip measurements. East US → West US is **69 ms**, and the reverse is **67 ms**. Microsoft's region list maps East US to Virginia and West US to California. These establish the broad datacenter coast-to-coast scale; they do not measure a residential connection or Railway. West US 2 is Washington, so its California-to-West-US-2 result should not be described as an Oregon measurement. [Azure latency methodology and table](https://learn.microsoft.com/en-us/azure/networking/azure-network-latency), [Azure region locations](https://learn.microsoft.com/en-us/azure/reliability/regions-list)

**CloudPing:** the measurement operator's own live matrix provides AWS-region proxies. Its default HTML selected **P50 / 1 Day** during inspection on November 12. A fresh fetch showed the following entries; rows are **To**, columns **From**. Values can change between fetches and are recorded observations of the public matrix, not a fixed dataset or an application's latency percentiles. [CloudPing matrix](https://www.cloudping.co/)

| Origin → destination | Observed TCP-connect metric |
| --- | ---: |
| AWS North Virginia → North California | 62.02 ms |
| AWS North California → North Virginia | 62.47 ms |
| AWS North California → Oregon | 19.24 ms |
| AWS Oregon → North California | 27.28 ms |

The operator's current source schedules regional Lambda probes every six hours and attempts five fresh IPv4 TCP connections to each region's DynamoDB endpoint on port 443. Timing surrounds `socket.connect` and read shutdown; hostname resolution is inside that interval. There is no TLS handshake or HTTP exchange. This is a **TCP-connect round-trip proxy**, not a pure packet RTT or SQL measurement. AWS-internal paths also do not establish Railway-to-Supabase cross-provider routing. [CloudPing source, `ping`, lines 172–240](https://github.com/mda590/cloudping.co/blob/master/ping_from_region/app.py#L172-L240), [operator methodology](https://github.com/mda590/cloudping.co)

## Use in the projection

The proposed model's **80 ms browser/API round trip (65–100 ms sensitivity range)** and **25 ms API/database round trip (15–35 ms sensitivity range)** are analyst-selected planning assumptions informed by these geographic proxies. The intervals are neither measured residential/cross-provider ranges nor confidence intervals. The sources support the order of magnitude; they cannot establish actual p50, p95 or p99 latency for this application.

Use one browser/API round trip per sequential warm HTTP operation and one API/database round trip per sequential awaited database submission. Database setup, transaction begin and commit count when they require separate submissions. Cold DNS/TCP/TLS/authentication, new database connections, edge overhead, transfer size, pool/lock queues and retries need separate treatment. Replace the assumptions with measurements from the actual browser location and deployed API/database path before treating the projection as a performance commitment.
