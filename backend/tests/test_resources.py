"""Warm-process resource and constant health handler validation.

This is a CI smoke bound, not a guarantee for all Render loads and workloads.
"""
import asyncio
import os
import pathlib
import statistics
import sys
import time
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
os.environ.setdefault("ASURA_ENGINE_SECRET", "ci-test-secret-32-bytes-or-more-do-not-use-in-production")
from main import health


class WarmHealthPerformance(unittest.TestCase):
    def test_warm_handler_median_below_five_milliseconds(self):
        async def sample():
            samples=[]
            for i in range(100):
                t=time.perf_counter()
                response=await health()
                samples.append((time.perf_counter()-t)*1000)
                self.assertEqual(response.status_code,200)
            return statistics.median(samples)
        measured=asyncio.run(sample())
        print(f"Warm in-process /health median: {measured:.3f} ms")
        self.assertLess(measured,5,"Warm local handler exceeded 5ms; check handler dependencies")

    def test_imported_python_coordinator_rss_below_two_hundred_mib_in_ci(self):
        if sys.platform != "linux":
            self.skipTest("RSS unit check assumes Linux ru_maxrss in KiB")
        import resource
        rss_mib=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024
        print(f"Warm CI Python process peak RSS: {rss_mib:.1f} MiB")
        self.assertLess(rss_mib,200,
            "Warm-import coordinator exceeded 200MiB RSS; inspect dependencies")


if __name__ == "__main__":
    unittest.main()
