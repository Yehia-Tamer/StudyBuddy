
import trafilatura as tr

d=tr.fetch_url("https://en.wikipedia.org/wiki/Machine_learning")

print(d is None)
